import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class RfqUpdateDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

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
