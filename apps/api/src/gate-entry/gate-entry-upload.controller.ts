import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

@Controller('gate-entry/upload')
export class GateEntryUploadController {
  @Post()
  @RequirePermissions('gate_entry.create')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads/gate-entry',
        filename: (_req, file, callback) => {
          const unique = `${Date.now()}-${randomUUID()}${extname(file.originalname)}`;
          callback(null, unique);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WEBP, HEIC, and PDF are allowed.`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files?.length) {
      throw new BadRequestException('No files were uploaded.');
    }
    return files.map((file) => ({
      fileName: file.originalname,
      fileUrl: `/uploads/gate-entry/${file.filename}`,
      fileSize: file.size,
      fileType: file.mimetype,
    }));
  }
}
