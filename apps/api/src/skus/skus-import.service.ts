import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ImportValidationResult {
  totalRecords: number;
  validRecords: any[];
  invalidRecords: any[];
  duplicateRecords: any[];
  newRecords: any[];
}

@Injectable()
export class SKUsImportService {
  private readonly logger = new Logger(SKUsImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async parseAndValidate(
    buffer: Buffer,
    originalname: string,
  ): Promise<ImportValidationResult> {
    try {
      const isCsv = originalname.toLowerCase().endsWith('.csv');
      let workbook;
      if (isCsv) {
        workbook = xlsx.read(buffer, { type: 'buffer' });
      } else {
        workbook = xlsx.read(buffer, { type: 'buffer' });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      const validRecords = [];
      const invalidRecords = [];
      const duplicateRecords = [];
      const newRecords = [];

      // Extract existing item codes to detect duplicates efficiently
      const allExtractedCodes = rawData
        .map((r: any) =>
          (r['Item Code'] || r['SKU Code'] || r['SKU'] || '').toString().trim(),
        )
        .filter((code) => code.length > 0);

      let existingCodes = new Set<string>();
      if (allExtractedCodes.length > 0) {
        const existingSkus = await this.prisma.sKU.findMany({
          where: { itemCode: { in: allExtractedCodes } },
          select: { itemCode: true },
        });
        existingCodes = new Set(existingSkus.map((i: any) => i.itemCode));
      }

      const seenCodesInFile = new Set<string>();

      let rowNum = 2; // Assuming row 1 is header
      for (const row of rawData as any[]) {
        const itemCode = (
          row['Item Code'] ||
          row['SKU Code'] ||
          row['SKU'] ||
          ''
        )
          .toString()
          .trim();
        const description = (
          row['Description'] ||
          row['Item Name'] ||
          row['Item Description'] ||
          ''
        )
          .toString()
          .trim();
        const uom = (row['UOM'] || row['Unit'] || '').toString().trim();

        // Resilient mapping for Category and Sub Group
        const category = (
          row['Category'] ||
          row['Item Category'] ||
          row['Group'] ||
          ''
        )
          .toString()
          .trim();

        const subGroup = (
          row['Sub Group'] ||
          row['Item Sub Group'] ||
          row['SubCategory'] ||
          ''
        )
          .toString()
          .trim();

        const errors = [];
        if (!itemCode) errors.push('Missing Item Code');
        if (!description) errors.push('Missing Description');
        if (!uom) errors.push('Missing UOM');

        const record = {
          rowNum,
          itemCode,
          description,
          uom,
          category,
          subGroup,
          errors,
        };

        if (errors.length > 0) {
          invalidRecords.push(record);
        } else if (seenCodesInFile.has(itemCode)) {
          record.errors = ['Duplicate Item Code in uploaded file'];
          invalidRecords.push(record);
        } else {
          seenCodesInFile.add(itemCode);
          if (existingCodes.has(itemCode)) {
            duplicateRecords.push(record);
            validRecords.push(record);
          } else {
            newRecords.push(record);
            validRecords.push(record);
          }
        }
        rowNum++;
      }

      return {
        totalRecords: rawData.length,
        validRecords,
        invalidRecords,
        duplicateRecords,
        newRecords,
      };
    } catch (e: any) {
      throw new BadRequestException('Failed to parse file: ' + e.message);
    }
  }

  async executeImport(
    userId: string,
    fileName: string,
    validRecords: any[],
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_NEW_ONLY',
  ) {
    if (!validRecords || validRecords.length === 0) {
      throw new BadRequestException('No valid records to import');
    }

    const allCodes = validRecords.map((r) => r.itemCode);
    const existingSkus = await this.prisma.sKU.findMany({
      where: { itemCode: { in: allCodes } },
      select: { itemCode: true, id: true },
    });
    const existingCodes = new Set(existingSkus.map((i: any) => i.itemCode));

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const toCreate = [];
    const toUpdate = [];

    for (const record of validRecords) {
      const isExisting = existingCodes.has(record.itemCode);
      if (isExisting) {
        if (
          duplicateStrategy === 'SKIP' ||
          duplicateStrategy === 'IMPORT_NEW_ONLY'
        ) {
          skipped++;
        } else if (duplicateStrategy === 'UPDATE') {
          toUpdate.push(record);
        }
      } else {
        toCreate.push({
          itemCode: record.itemCode,
          description: record.description,
          uom: record.uom,
          category: record.category || null,
          subGroup: record.subGroup || null,
          status: 'Active',
        });
      }
    }

    // Batch create using Prisma createMany (fast)
    if (toCreate.length > 0) {
      // Split into chunks of 5000 to be safe for neon parameters limit
      const chunkSize = 5000;
      for (let i = 0; i < toCreate.length; i += chunkSize) {
        const chunk = toCreate.slice(i, i + chunkSize);
        const result = await this.prisma.sKU.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        imported += result.count;
      }
    }

    // Batch update via a parameterized VALUES join (fast, and safe from SQL
    // injection — Prisma.sql/Prisma.join bind every value as a query
    // parameter rather than interpolating it into the SQL string).
    if (toUpdate.length > 0) {
      const updateChunkSize = 2000;
      for (let i = 0; i < toUpdate.length; i += updateChunkSize) {
        const chunk = toUpdate.slice(i, i + updateChunkSize);

        const valueRows = chunk.map(
          (r) =>
            Prisma.sql`(${r.itemCode}, ${r.description}, ${r.uom}, ${r.category || null}, ${r.subGroup || null})`,
        );

        const sql = Prisma.sql`
          UPDATE "Item" AS t
          SET
            description = c.description,
            uom = c.uom,
            category = c.category,
            "subGroup" = c."subGroup"
          FROM (VALUES ${Prisma.join(valueRows)}) AS c("itemCode", description, uom, category, "subGroup")
          WHERE c."itemCode" = t."itemCode"
        `;

        try {
          await this.prisma.$executeRaw(sql);
        } catch (err) {
          this.logger.error('Bulk update failed', err);
        }
        updated += chunk.length;
      }
    }

    // Record import history
    await this.prisma.importHistory.create({
      data: {
        userId,
        fileName,
        totalRecords: validRecords.length,
        validRecords: imported + updated,
        invalidRecords: 0,
        duplicateCount: existingCodes.size,
        status: 'COMPLETED',
      },
    });

    return { imported, updated, skipped };
  }

  async generateTemplate(): Promise<Buffer> {
    const ws = xlsx.utils.aoa_to_sheet([
      ['Item Code', 'Description', 'UOM', 'Category', 'Sub Group'],
      ['SAMPLE-001', 'Sample Item 1', 'NOS', 'MECHANICAL', 'Motors'],
      ['SAMPLE-002', 'Sample Item 2', 'KGS', 'ELECTRICAL', 'Panels'],
    ]);

    // Add instruction sheet
    const wsInstructions = xlsx.utils.aoa_to_sheet([
      ['IFH One - Bulk Import Instructions'],
      [''],
      ['1. Do not change the column headers in the "Template" sheet.'],
      ['2. Item Code is mandatory and must be unique.'],
      ['3. Description and UOM are mandatory.'],
      ['4. Category and Sub Group are optional.'],
      ['5. Recommended Categories: MECHANICAL, ELECTRICAL, PLUMBING, SAFETY'],
    ]);

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template');
    xlsx.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportItems(skus: any[]): Promise<Buffer> {
    const rows = skus.map((sku) => ({
      'Item Code': sku.itemCode,
      Description: sku.description,
      UOM: sku.uom,
      Category: sku.category || '',
      'Sub Group': sku.subGroup || '',
      Status: sku.status,
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'SKUs Export');

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
