import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  ValidateNested,
  ArrayNotEmpty,
  Min,
  Max,
  IsDecimal,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────

export enum VendorFormStatus {
  PENDING = 'PENDING',
  EMAIL_SENT = 'EMAIL_SENT',
  FORM_OPENED = 'FORM_OPENED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  VIEWED_BY_BUYER = 'VIEWED_BY_BUYER',
  UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
  REVISED_SUBMITTED = 'REVISED_SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum QuotationStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  UNDER_NEGOTIATION = 'UNDER_NEGOTIATION',
  NEGOTIATION_COMPLETE = 'NEGOTIATION_COMPLETE',
  SHORTLISTED = 'SHORTLISTED',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export enum DocumentType {
  QUOTATION = 'QUOTATION',
  DATASHEET = 'DATASHEET',
  TECHNICAL_SPECIFICATION = 'TECHNICAL_SPECIFICATION',
  COMPLIANCE_CERTIFICATE = 'COMPLIANCE_CERTIFICATE',
  CERTIFICATE_OF_ORIGIN = 'CERTIFICATE_OF_ORIGIN',
  BROCHURE = 'BROCHURE',
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  GST_CERTIFICATE = 'GST_CERTIFICATE',
  OTHER_SUPPORTING_DOCUMENT = 'OTHER_SUPPORTING_DOCUMENT',
}

// ─── DTO Classes ──────────────────────────────────────────────────────────

export class CreateVendorQuotationLineItemDto {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  itemName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unitOfMeasure: string;

  @IsNumber()
  @Min(0)
  quotedRate: number;

  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCharges?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packingCharges?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  brandOffered?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  moqMinimum?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  warranty?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  technicalDetails?: string;
}

export class CreateVendorQuotationDto {
  @IsUUID()
  vendorFormId: string;

  @IsUUID()
  rfqId: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  advancePercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditDays?: number;

  @IsOptional()
  @IsBoolean()
  freightIncluded?: boolean = false;

  @IsOptional()
  @IsBoolean()
  insuranceIncluded?: boolean = false;

  @IsOptional()
  @IsBoolean()
  taxesIncluded?: boolean = false;

  @IsOptional()
  @IsBoolean()
  packingIncluded?: boolean = false;

  @IsOptional()
  @IsString()
  deliveryBasis?: string;

  @IsOptional()
  @IsString()
  warranty?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  replacementPolicy?: string;

  @IsOptional()
  @IsBoolean()
  penaltyClauseAccepted?: boolean = false;

  @IsOptional()
  @IsBoolean()
  complianceConfirmed?: boolean = false;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsDateString()
  pricesValidFrom?: string;

  @IsOptional()
  @IsDateString()
  pricesValidTo?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  authorizedPerson: string;

  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  digitalSignature?: string;

  @IsOptional()
  @IsString()
  companyLogo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grandTotalAmount?: number;

  @IsOptional()
  @IsString()
  grandTotalCurrency?: string = 'INR';

  @IsOptional()
  @IsString()
  quotationRemarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVendorQuotationLineItemDto)
  lineItems: CreateVendorQuotationLineItemDto[];
}

export class SubmitVendorQuotationDto {
  @IsUUID()
  vendorFormId: string;

  @IsUUID()
  rfqId: string;

  @IsString()
  authorizedPerson: string;

  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  digitalSignature?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVendorQuotationLineItemDto)
  lineItems: CreateVendorQuotationLineItemDto[];

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryBasis?: string;

  @IsOptional()
  @IsString()
  warranty?: string;

  @IsOptional()
  @IsNumber()
  grandTotalAmount?: number;
}

export class VendorFormDto {
  @IsUUID()
  rfqId: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsString()
  vendorCode: string;

  @IsString()
  vendorName: string;

  @IsEmail()
  vendorEmail: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;
}

export class GenerateVendorFormsDto {
  @IsUUID()
  rfqId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VendorFormDto)
  vendors: VendorFormDto[];
}

export class UpdateQuotationStatusDto {
  @IsEnum(QuotationStatus)
  status: QuotationStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SendNegotiationRoundDto {
  @IsUUID()
  quotationId: string;

  @IsOptional()
  @IsString()
  requestedAdjustments?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  counterOfferAmount?: number;

  @IsOptional()
  @IsString()
  counterOfferTerms?: string;
}

export class RFQComparisonFilterDto {
  @IsUUID()
  rfqId: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  quotationIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  itemCodes?: string[];
}
