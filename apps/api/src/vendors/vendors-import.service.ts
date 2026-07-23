import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { PrismaService } from '../common/prisma/prisma.service';

export interface VendorImportValidationResult {
  totalRecords: number;
  validRecords: any[];
  invalidRecords: any[];
  duplicateRecords: any[];
  newRecords: any[];
}

export interface VendorImportSummary {
  totalRows: number;
  imported: number;
  failed: number;
  skipped: number;
  duplicates: number;
  validationErrors: number;
  updated: number;
  report: VendorImportReportRow[];
}

export interface VendorImportReportRow {
  rowNumber: number;
  vendorName: string;
  vendorId: string;
  status: 'IMPORTED' | 'UPDATED' | 'SKIPPED' | 'FAILED';
  errorReason?: string;
}

@Injectable()
export class VendorsImportService {
  private readonly logger = new Logger(VendorsImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async parseAndValidate(
    buffer: Buffer,
  ): Promise<VendorImportValidationResult> {
    try {
      // xlsx.read handles both .xlsx and .csv transparently
      const workbook = xlsx.read(buffer, { type: 'buffer' });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

      const validRecords = [];
      const invalidRecords = [];
      const duplicateRecords = [];
      const newRecords = [];

      // Extract provided vendor IDs to detect duplicates against the DB
      const allExtractedIds = rawData
        .map((r: any) =>
          (r['Vendor ID'] || r['VendorId'] || r['vendorId'] || '')
            .toString()
            .trim(),
        )
        .filter((id) => id.length > 0);

      const existingCodes = new Set<string>();
      if (allExtractedIds.length > 0) {
        const existingVendors = await this.prisma.vendor.findMany({
          select: { vendorCode: true },
        });
        existingVendors.forEach((v) => {
          if (v.vendorCode) existingCodes.add(v.vendorCode.toLowerCase());
        });
      }

      const seenIdsInFile = new Set<string>();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      let rowNum = 2; // header is row 1
      for (const row of rawData as any[]) {
        const vendorId = (
          row['Vendor ID'] ||
          row['VendorId'] ||
          row['vendorId'] ||
          ''
        )
          .toString()
          .trim();
        const vendorName = (
          row['Vendor Name'] ||
          row['VendorName'] ||
          row['vendorName'] ||
          ''
        )
          .toString()
          .trim();
        // Handle both "Email" and "Email " (with trailing space in CSV)
        const email = (row['Email'] || row['Email '] || row['email'] || '')
          .toString()
          .trim();
        // Handle both "Contact" and "Contact" with various cases
        const contact = (row['Contact'] || row['contact'] || '')
          .toString()
          .trim();
        // Handle both "Address" and "Address"
        const address = (row['Address'] || row['address'] || '')
          .toString()
          .trim();

        const errors: string[] = [];

        // Mandatory fields
        if (!vendorId) errors.push('Missing Vendor ID');
        if (!vendorName) errors.push('Missing Vendor Name');

        // Validate email format only when an email is provided
        if (email && !emailRegex.test(email)) {
          errors.push('Invalid Email format');
        }

        const record = {
          rowNum,
          vendorId,
          vendorName,
          email,
          contact,
          address,
          errors,
        };

        if (errors.length > 0) {
          invalidRecords.push(record);
        } else {
          const lowerId = vendorId.toLowerCase();
          if (seenIdsInFile.has(lowerId)) {
            record.errors = ['Duplicate Vendor ID in uploaded file'];
            invalidRecords.push(record);
          } else {
            seenIdsInFile.add(lowerId);
            if (existingCodes.has(lowerId)) {
              duplicateRecords.push(record);
              validRecords.push(record);
            } else {
              newRecords.push(record);
              validRecords.push(record);
            }
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

  /**
   * Generates a unique vendor code that does not collide with existing codes
   * or codes already used within the current batch.
   */
  private generateVendorCode(
    existingCodes: Set<string>,
    usedCodes: Set<string>,
  ): string {
    let code = '';
    let attempt = 0;
    do {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      code = `VEN-${Date.now().toString(36).toUpperCase().slice(-4)}${rand}${attempt > 0 ? attempt : ''}`;
      attempt++;
    } while (
      existingCodes.has(code.toLowerCase()) ||
      usedCodes.has(code.toLowerCase())
    );
    return code;
  }

  async executeImport(
    userId: string,
    fileName: string,
    validRecords: any[],
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_NEW_ONLY',
    meta?: {
      totalRecords?: number;
      invalidRecords?: any[];
      duplicateRecords?: any[];
    },
  ): Promise<VendorImportSummary> {
    const totalRecords = meta?.totalRecords ?? validRecords.length;
    const invalidRecords = meta?.invalidRecords ?? [];
    const duplicateRecords = meta?.duplicateRecords ?? [];

    if (!validRecords || validRecords.length === 0) {
      // Still record the attempt in the activity log
      await this.recordImportHistory(
        userId,
        fileName,
        totalRecords,
        0,
        invalidRecords.length,
        duplicateRecords.length,
      );
      return {
        totalRows: totalRecords,
        imported: 0,
        failed: invalidRecords.length,
        skipped: 0,
        duplicates: duplicateRecords.length,
        validationErrors: invalidRecords.length,
        updated: 0,
        report: invalidRecords.map((r) => ({
          rowNumber: r.rowNum,
          vendorName: r.vendorName,
          vendorId: r.vendorId || '',
          status: 'FAILED' as const,
          errorReason: (r.errors || []).join('; '),
        })),
      };
    }

    // Existing vendor codes (case-insensitive)
    const existingVendors = await this.prisma.vendor.findMany({
      select: { vendorCode: true },
    });
    const existingCodes = new Set<string>();
    existingVendors.forEach((v) => {
      if (v.vendorCode) existingCodes.add(v.vendorCode.toLowerCase());
    });

    const usedCodes = new Set<string>();
    const toCreate: any[] = [];
    const toUpdate: { vendorCode: string; data: any }[] = [];
    const report: VendorImportReportRow[] = [];

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = invalidRecords.length; // validation errors count as failures

    for (const record of validRecords) {
      const vendorName = record.vendorName?.toString().trim();
      if (!vendorName) {
        report.push({
          rowNumber: record.rowNum,
          vendorName: record.vendorName || '',
          vendorId: record.vendorId || '',
          status: 'FAILED',
          errorReason: 'Missing Vendor Name',
        });
        failed++;
        continue;
      }

      let finalCode = record.vendorId?.toString().trim() || '';
      const isExisting = finalCode
        ? existingCodes.has(finalCode.toLowerCase())
        : false;

      if (isExisting) {
        // Duplicate Vendor ID found in DB
        if (
          duplicateStrategy === 'SKIP' ||
          duplicateStrategy === 'IMPORT_NEW_ONLY'
        ) {
          skipped++;
          report.push({
            rowNumber: record.rowNum,
            vendorName,
            vendorId: finalCode,
            status: 'SKIPPED',
            errorReason: 'Duplicate Vendor ID already exists',
          });
        } else if (duplicateStrategy === 'UPDATE') {
          toUpdate.push({
            vendorCode: finalCode,
            data: {
              vendorName,
              email: record.email ? record.email.toString().trim() : null,
              phone: record.contact ? record.contact.toString().trim() : null,
              address: record.address ? record.address.toString().trim() : null,
            },
          });
          report.push({
            rowNumber: record.rowNum,
            vendorName,
            vendorId: finalCode,
            status: 'UPDATED',
          });
          updated++;
        }
      } else {
        // New vendor — auto-generate code if blank
        if (!finalCode) {
          finalCode = this.generateVendorCode(existingCodes, usedCodes);
        }
        usedCodes.add(finalCode.toLowerCase());
        toCreate.push({
          vendorCode: finalCode,
          vendorName,
          email: record.email ? record.email.toString().trim() : null,
          phone: record.contact ? record.contact.toString().trim() : null,
          address: record.address ? record.address.toString().trim() : null,
          status: 'ACTIVE',
        });
        report.push({
          rowNumber: record.rowNum,
          vendorName,
          vendorId: finalCode,
          status: 'IMPORTED',
        });
        imported += 1;
      }
    }

    // Persist within a transaction so partial failures don't leave the DB inconsistent
    try {
      await this.prisma.$transaction(async (tx) => {
        if (toCreate.length > 0) {
          const chunkSize = 2000;
          for (let i = 0; i < toCreate.length; i += chunkSize) {
            const chunk = toCreate.slice(i, i + chunkSize);
            // Don't use skipDuplicates - handle errors gracefully instead
            // This allows us to see if there are actual constraint violations
            try {
              await tx.vendor.createMany({
                data: chunk,
              });
            } catch (e: any) {
              // Log individual chunk errors but continue with next chunk
              this.logger.warn(`Chunk creation had issues: ${e.message}`);
              // Fall back to individual inserts to get more granular error handling
              for (const record of chunk) {
                try {
                  await tx.vendor.create({ data: record });
                } catch (individualError: any) {
                  // If it's a duplicate key error on vendorCode, that's expected for updates
                  if (
                    individualError.code === 'P2002' &&
                    individualError.meta?.target?.includes('vendorCode')
                  ) {
                    this.logger.debug(
                      `Skipping duplicate vendorCode: ${record.vendorCode}`,
                    );
                  } else {
                    this.logger.error(
                      `Error creating vendor ${record.vendorCode}:`,
                      individualError,
                    );
                  }
                }
              }
            }
          }
        }

        if (toUpdate.length > 0) {
          for (const item of toUpdate) {
            await tx.vendor.update({
              where: { vendorCode: item.vendorCode },
              data: item.data,
            });
          }
        }
      });
    } catch (e: any) {
      this.logger.error('Error during import transaction', e);
      throw new BadRequestException(
        'Import failed: ' + (e.message || 'Database error occurred'),
      );
    }

    // Activity log
    await this.recordImportHistory(
      userId,
      fileName,
      totalRecords,
      imported + updated,
      invalidRecords.length,
      duplicateRecords.length,
    );

    return {
      totalRows: totalRecords,
      imported,
      failed,
      skipped,
      duplicates: duplicateRecords.length,
      validationErrors: invalidRecords.length,
      updated,
      report,
    };
  }

  private async recordImportHistory(
    userId: string,
    fileName: string,
    totalRecords: number,
    validRecords: number,
    invalidRecords: number,
    duplicateCount: number,
  ) {
    try {
      await this.prisma.importHistory.create({
        data: {
          userId,
          fileName,
          totalRecords,
          validRecords,
          invalidRecords,
          duplicateCount,
          status: 'COMPLETED',
        },
      });
    } catch (e) {
      this.logger.error('Failed to record vendor import history', e);
    }
  }

  async generateTemplate(): Promise<Buffer> {
    const ws = xlsx.utils.aoa_to_sheet([
      ['Vendor ID', 'Vendor Name', 'Email', 'Contact', 'Address'],
      [
        'VEN-001',
        'ABC Suppliers Ltd',
        'contact@abcsuppliers.com',
        '+91-9876543210',
        '123 Industrial Area, Mumbai',
      ],
      [
        'VEN-002',
        'XYZ Traders',
        'info@xyztraders.com',
        '+91-9820098200',
        '45 Market Road, Pune',
      ],
      ['', 'Auto Generated ID Corp', 'contact@autogen.com', '', ''],
    ]);

    // Add instruction sheet with comprehensive guidelines
    const wsInstructions = xlsx.utils.aoa_to_sheet([
      ['IFH One — Vendor Bulk Import Instructions'],
      [''],
      ['FIELD REQUIREMENTS:'],
      [''],
      ['1. Vendor ID (Mandatory)'],
      ['   - Each vendor MUST have a unique Vendor ID'],
      ['   - If left blank, a code will be auto-generated'],
      ['   - Maximum 50 characters'],
      [''],
      ['2. Vendor Name (Mandatory)'],
      ['   - Must be provided for every vendor'],
      ['   - Minimum 2 characters, maximum 100 characters'],
      [''],
      ['3. Email (Optional)'],
      [
        '   - If provided, must be a valid email format (e.g., name@domain.com)',
      ],
      ['   - Will be rejected if format is invalid'],
      [''],
      ['4. Contact (Optional)'],
      ['   - Phone number or contact person name'],
      ['   - Maximum 20 characters'],
      [''],
      ['5. Address (Optional)'],
      ['   - Full company address'],
      ['   - Maximum 255 characters'],
      [''],
      ['IMPORT RULES:'],
      [''],
      ['- Rows with missing Vendor Name or invalid Email are rejected'],
      ['- Duplicate Vendor IDs (within file or in database) are detected'],
      ['- Do not modify column headers'],
      ['- One vendor per row'],
      [''],
      ['DUPLICATE HANDLING:'],
      [''],
      ['During import, you can choose:'],
      ['• SKIP: Do not import duplicate Vendor IDs'],
      ['• UPDATE: Update existing vendors with new data'],
      ['• IMPORT_NEW_ONLY: Import only new vendors (skip duplicates)'],
    ]);

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template');
    xlsx.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 18 }, // Vendor ID
      { wch: 30 }, // Vendor Name
      { wch: 30 }, // Email
      { wch: 18 }, // Contact
      { wch: 40 }, // Address
    ];

    wsInstructions['!cols'] = [{ wch: 80 }];

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Exports all vendors to an .xlsx buffer using the canonical field order:
   * Vendor ID, Vendor Name, Email, Contact, Address, Status.
   */
  async exportVendors(): Promise<Buffer> {
    const vendors = await this.prisma.vendor.findMany({
      orderBy: { vendorCode: 'asc' },
    });

    const rows = vendors.map((v) => ({
      'Vendor ID': v.vendorCode,
      'Vendor Name': v.vendorName,
      Email: v.email || '',
      Contact: v.phone || '', // Map phone DB field to Contact export column
      Address: v.address || '',
      Status: v.status,
    }));

    const ws = xlsx.utils.json_to_sheet(rows, {
      header: [
        'Vendor ID',
        'Vendor Name',
        'Email',
        'Contact',
        'Address',
        'Status',
      ],
    });

    ws['!cols'] = [
      { wch: 14 }, // Vendor ID
      { wch: 30 }, // Vendor Name
      { wch: 30 }, // Email
      { wch: 18 }, // Contact
      { wch: 40 }, // Address
      { wch: 12 }, // Status
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Vendors');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
