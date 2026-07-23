import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';

export class BulkPoUpdateItemDto {
  @IsString()
  itemId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  poNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remarks?: string;
}

export class BulkPoCreationDto {
  @IsArray()
  items!: BulkPoUpdateItemDto[];

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class PoApprovalActionDto {
  @IsString()
  action!: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remarks?: string;

  @IsString()
  @IsOptional()
  reason?: string; // Required for rejection
}

export class PoViewFullDto {
  @IsString()
  itemId!: string;
}
