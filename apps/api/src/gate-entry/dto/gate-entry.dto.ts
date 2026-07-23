import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Step 1: Gate Entry ──────────────────────────────────────────────────────
export class GateEntrySelectedItemDto {
  @IsString()
  @IsNotEmpty()
  procurementItemId: string;

  @IsNumber()
  @Min(0.001)
  declaredQty: number;
}

export class CreateGateEntryDto {
  @IsString()
  @IsNotEmpty()
  procurementId: string;

  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GateEntrySelectedItemDto)
  items: GateEntrySelectedItemDto[];

  // Attachment references — files are uploaded separately via /gate-entry/upload
  // first, then their returned fileUrl/fileName are passed here.
  @IsArray()
  @IsOptional()
  invoicePhotoUrls?: { fileName: string; fileUrl: string }[];

  @IsArray()
  @IsOptional()
  materialPhotoUrls?: { fileName: string; fileUrl: string }[];
}

// ─── Step 2: Quantity Verification ──────────────────────────────────────────
export class QuantityCheckItemDto {
  @IsString()
  @IsNotEmpty()
  gateEntryItemId: string;

  @IsNumber()
  @Min(0)
  receivedQty: number;
}

export class SubmitQuantityCheckDto {
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  invoiceDate: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuantityCheckItemDto)
  items: QuantityCheckItemDto[];
}

// ─── Step 3: Quality Inspection ─────────────────────────────────────────────
export class QualityCheckItemDto {
  @IsString()
  @IsNotEmpty()
  gateEntryItemId: string;

  @IsIn(['ACCEPTED', 'REJECTED', 'ACCEPTED_WITH_DEVIATION'])
  qualityStatus: 'ACCEPTED' | 'REJECTED' | 'ACCEPTED_WITH_DEVIATION';

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  actualSizeReceived?: string;

  @IsString()
  @IsOptional()
  inspectionRemarks?: string;
}

export class SubmitQualityCheckDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityCheckItemDto)
  items: QualityCheckItemDto[];
}

// ─── Step 4: Material Allocation (+ GRN generation) ─────────────────────────
export class AllocationItemDto {
  @IsString()
  @IsNotEmpty()
  gateEntryItemId: string;

  @IsString()
  @IsOptional()
  allocatedLocation?: string; // required for ACCEPTED / ACCEPTED_WITH_DEVIATION items, validated in service
}

export class SubmitAllocationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  items: AllocationItemDto[];
}
