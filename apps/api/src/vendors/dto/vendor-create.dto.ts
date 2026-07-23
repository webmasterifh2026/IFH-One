import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLACKLISTED = 'BLACKLISTED',
}

/**
 * DTO for creating a new vendor.
 *
 * CANONICAL FIELD MAPPING:
 * - vendorCode → Vendor ID (Mandatory, unique, 1-50 chars)
 * - vendorName → Vendor Name (Mandatory, 2-100 chars)
 * - email → Email (Optional, valid email format if provided)
 * - contact → Contact (Optional, max 20 chars)
 * - address → Address (Optional, max 255 chars)
 * - status → Status (Optional, defaults to ACTIVE)
 *
 * This is the single source of truth for vendor field definitions.
 */
export class VendorCreateDto {
  @IsString({ message: 'Vendor ID must be a string' })
  @MinLength(1, { message: 'Vendor ID cannot be empty' })
  @MaxLength(50, { message: 'Vendor ID cannot exceed 50 characters' })
  vendorCode: string;

  @IsString({ message: 'Vendor Name must be a string' })
  @MinLength(2, { message: 'Vendor Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Vendor Name cannot exceed 100 characters' })
  vendorName: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Contact must be a string' })
  @MaxLength(20, { message: 'Contact cannot exceed 20 characters' })
  @IsOptional()
  contact?: string;

  @IsString({ message: 'Address must be a string' })
  @MaxLength(255, { message: 'Address cannot exceed 255 characters' })
  @IsOptional()
  address?: string;

  @IsEnum(VendorStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or BLACKLISTED',
  })
  @IsOptional()
  status?: VendorStatus = VendorStatus.ACTIVE;
}
