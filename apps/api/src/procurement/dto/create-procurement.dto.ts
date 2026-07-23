import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProcurementItemDto {
  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsString()
  @IsOptional()
  bbuCode?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  technicalSpec?: string;

  @IsString()
  @IsOptional()
  approvedMakes?: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}

export class CreateProcurementDto {
  // ── Section 1: Request Information ──────────────────────────────────
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsString()
  @IsOptional()
  application?: string;

  @IsString()
  @IsOptional()
  itemType?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  // ── Section 3: Procurement Requirements ─────────────────────────────
  @IsString()
  @IsOptional()
  requiredDate?: string;

  @IsString()
  @IsOptional()
  paintingSpec?: string;

  @IsString()
  @IsOptional()
  paintingSpecRemark?: string;

  @IsString()
  @IsOptional()
  packingRequirement?: string;

  // ── Section 4: Document Requirements ────────────────────────────────
  @IsString()
  @IsOptional()
  certification?: string;

  @IsString()
  @IsOptional()
  manuals?: string;

  @IsString()
  @IsOptional()
  warrantyGuarantee?: string;

  @IsString()
  @IsOptional()
  ga?: string;

  // ── Items ────────────────────────────────────────────────────────────
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcurementItemDto)
  items?: CreateProcurementItemDto[];

  @IsBoolean()
  @IsOptional()
  submit?: boolean;
}
