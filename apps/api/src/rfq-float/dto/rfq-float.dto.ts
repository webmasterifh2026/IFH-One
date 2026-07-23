import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsBoolean,
  IsNumber,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

// ─── Create RFQ Float ──────────────────────────────────────────────────────

export class RfqFloatItemDto {
  @IsString()
  indentId!: string;

  @IsString()
  indentItemId!: string;

  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  itemName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  itemRemarks?: string;

  @IsString()
  @IsOptional()
  make?: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  @IsOptional()
  uom?: string;

  @IsNumber()
  @IsOptional()
  unitWeight?: number;

  @IsNumber()
  @IsOptional()
  totalWeight?: number;

  @IsBoolean()
  @IsOptional()
  isAvailableInStore?: boolean;

  @IsBoolean()
  @IsOptional()
  isSelected?: boolean;
}

export class RfqFloatVendorDto {
  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  vendorCode?: string;

  @IsString()
  vendorName!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateRfqFloatDto {
  @IsDateString()
  @IsOptional()
  rfqDate?: string;

  @IsDateString()
  @IsOptional()
  submissionDeadline?: string;

  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @IsString()
  @IsOptional()
  filledById?: string;

  @IsString()
  @IsOptional()
  deliveryLocation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remarks?: string;

  @IsArray()
  @ArrayMinSize(1)
  items!: RfqFloatItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  vendors!: RfqFloatVendorDto[];
}

// ─── Add Vendor to RFQ Float ───────────────────────────────────────────────

export class AddVendorDto {
  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  vendorCode?: string;

  @IsString()
  vendorName!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

// ─── Quick Vendor Creation ─────────────────────────────────────────────────

export class QuickVendorDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

// ─── TCE DTOs ──────────────────────────────────────────────────────────────

export class TCEFilterDto {
  @IsString()
  @IsOptional()
  rfqFloatId?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

// ─── Negotiation DTOs ──────────────────────────────────────────────────────

export class StartNegotiationDto {
  @IsString()
  tceId!: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class NegotiationItemDto {
  @IsString()
  @IsOptional()
  tceItemId?: string;

  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  itemName!: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  uom?: string;

  @IsNumber()
  @IsOptional()
  originalRate?: number;

  @IsNumber()
  @IsOptional()
  negotiatedRate?: number;

  @IsNumber()
  @IsOptional()
  finalRate?: number;

  @IsNumber()
  @IsOptional()
  discountPercentage?: number;

  @IsString()
  @IsOptional()
  deliveryTerms?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateNegotiationDto {
  @IsArray()
  @IsOptional()
  items?: NegotiationItemDto[];

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
