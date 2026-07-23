import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { VendorStatus } from './vendor-create.dto';

/**
 * DTO for updating an existing vendor.
 * Note: vendorCode cannot be updated (immutable field).
 *
 * All fields are optional but if provided, must be valid:
 * - vendorName: 2-100 characters
 * - email: valid email format
 * - contact: max 20 characters
 * - address: max 255 characters
 * - status: ACTIVE, INACTIVE, or BLACKLISTED
 */
export class VendorUpdateDto {
  @IsString({ message: 'Vendor Name must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'Vendor Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Vendor Name cannot exceed 100 characters' })
  vendorName?: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Contact must be a string' })
  @IsOptional()
  @MaxLength(20, { message: 'Contact cannot exceed 20 characters' })
  contact?: string;

  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Address cannot exceed 255 characters' })
  address?: string;

  @IsEnum(VendorStatus, {
    message: 'Status must be ACTIVE, INACTIVE, or BLACKLISTED',
  })
  @IsOptional()
  status?: VendorStatus;
}
