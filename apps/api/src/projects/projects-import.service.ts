import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ProjectImportValidationResult {
  totalRecords: number;
  validRecords: any[];
  invalidRecords: any[];
  duplicateRecords: any[];
  newRecords: any[];
}

@Injectable()
export class ProjectsImportService {
  private readonly logger = new Logger(ProjectsImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async parseAndValidate(
    buffer: Buffer,
    originalname: string,
  ): Promise<ProjectImportValidationResult> {
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

      // Extract existing project IDs to detect duplicates efficiently
      const allExtractedIds = rawData
        .map((r: any) =>
          (r['Project ID'] || r['ProjectID'] || r['project_id'] || '')
            .toString()
            .trim(),
        )
        .filter((id) => id.length > 0);

      const existingIds = new Set<string>();
      if (allExtractedIds.length > 0) {
        // Case-insensitive lookup isn't directly supported by 'in' natively with case-insensitivity in basic prisma without string processing,
        // but we'll fetch exactly what we look for.
        // Prisma `in` is case-sensitive. The requirement says "Case insensitive duplicate check".
        // To handle case-insensitive check efficiently:
        const existingProjects = await this.prisma.project.findMany({
          select: { projectId: true },
        });
        // Build set of lowercase existing IDs
        existingProjects.forEach((p) => {
          if (p.projectId) {
            existingIds.add(p.projectId.toLowerCase());
          }
        });
      }

      const seenIdsInFile = new Set<string>();

      let rowNum = 2; // Assuming row 1 is header
      for (const row of rawData as any[]) {
        const projectId = (
          row['Project ID'] ||
          row['ProjectID'] ||
          row['project_id'] ||
          ''
        )
          .toString()
          .trim();
        const projectName = (
          row['Project Name'] ||
          row['ProjectName'] ||
          row['project_name'] ||
          ''
        )
          .toString()
          .trim();

        const errors = [];
        if (!projectId) errors.push('Missing Project ID');
        if (!projectName) errors.push('Missing Project Name');

        const record = {
          rowNum,
          projectId,
          projectName,
          errors,
        };

        if (errors.length > 0) {
          invalidRecords.push(record);
        } else {
          const lowerId = projectId.toLowerCase();
          if (seenIdsInFile.has(lowerId)) {
            record.errors = ['Duplicate Project ID in uploaded file'];
            invalidRecords.push(record);
          } else {
            seenIdsInFile.add(lowerId);
            if (existingIds.has(lowerId)) {
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

  async executeImport(
    userId: string,
    fileName: string,
    validRecords: any[],
    duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_NEW_ONLY',
  ) {
    if (!validRecords || validRecords.length === 0) {
      throw new BadRequestException('No valid records to import');
    }

    // Get all existing projectIds to know whether to insert or update
    const existingProjects = await this.prisma.project.findMany({
      select: { projectId: true },
    });

    // Create map for case-insensitive lookup
    const existingMap = new Map<string, string>();
    existingProjects.forEach((p) => {
      existingMap.set(p.projectId.toLowerCase(), p.projectId);
    });

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const toCreate = [];
    const toUpdate = [];

    for (const record of validRecords) {
      const lowerId = record.projectId.toLowerCase();
      const isExisting = existingMap.has(lowerId);

      if (isExisting) {
        if (
          duplicateStrategy === 'SKIP' ||
          duplicateStrategy === 'IMPORT_NEW_ONLY'
        ) {
          skipped++;
        } else if (duplicateStrategy === 'UPDATE') {
          // Keep the original existing ID casing to update the correct row safely
          const originalId = existingMap.get(lowerId)!;
          toUpdate.push({ ...record, originalId });
        }
      } else {
        toCreate.push({
          projectId: record.projectId, // keep user's original casing for new inserts
          projectName: record.projectName,
        });
      }
    }

    // Batch create using Prisma createMany (fast)
    if (toCreate.length > 0) {
      const chunkSize = 5000;
      for (let i = 0; i < toCreate.length; i += chunkSize) {
        const chunk = toCreate.slice(i, i + chunkSize);
        const result = await this.prisma.project.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        imported += result.count;
      }
    }

    // Batch update using raw SQL (blazing fast)
    if (toUpdate.length > 0) {
      const updateChunkSize = 2000;
      for (let i = 0; i < toUpdate.length; i += updateChunkSize) {
        const chunk = toUpdate.slice(i, i + updateChunkSize);

        const valuesList = chunk
          .map(
            (r) => `(
          '${r.originalId.replace(/'/g, "''")}', 
          '${r.projectName.replace(/'/g, "''")}'
        )`,
          )
          .join(', ');

        const sql = `
          UPDATE projects_db AS t 
          SET project_name = c.project_name
          FROM (VALUES ${valuesList}) AS c(project_id_, project_name)
          WHERE c.project_id_ = t.project_id_
        `;

        try {
          await this.prisma.$executeRawUnsafe(sql);
          updated += chunk.length;
        } catch (err) {
          this.logger.error('Bulk update failed', err);
        }
      }
    }

    return { imported, updated, skipped };
  }

  async generateTemplate(): Promise<Buffer> {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet([
      {
        'Project ID': 'P001',
        'Project Name': 'Boiler Expansion',
      },
      {
        'Project ID': 'P002',
        'Project Name': 'New HVAC Installation',
      },
    ]);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Project ID
      { wch: 40 }, // Project Name
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Projects Import Template');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
