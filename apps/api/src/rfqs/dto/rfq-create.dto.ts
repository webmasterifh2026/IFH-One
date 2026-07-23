import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
} from 'class-validator';

export enum RFQType {
  OPEN = 'OPEN',
  LIMITED = 'LIMITED',
  SINGLE = 'SINGLE',
  EMERGENCY = 'EMERGENCY',
}

export enum RFQStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
}

export enum VendorResponseStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  RESPONDED = 'RESPONDED',
  DECLINED = 'DECLINED',
}

export class RfqCreateDto {
  @IsUUID()
  indentId: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RFQType)
  @IsOptional()
  rfqType?: RFQType;

  @IsDateString()
  @IsOptional()
  submissionDeadline?: string;

  @IsDateString()
  @IsOptional()
  expectedDelivery?: string;

  @IsString()
  @IsOptional()
  commercialTerms?: string;

  @IsString()
  @IsOptional()
  deliveryTerms?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  warrantyReqs?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;
}
