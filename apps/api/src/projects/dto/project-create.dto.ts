import {
  IsString,
  IsOptional,
  IsDateString,
  IsDecimal,
  IsEnum,
} from 'class-validator';

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class ProjectCreateDto {
  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  projectCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  siteLocation?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  budget?: number; // In decimal format

  @IsOptional()
  @IsString()
  budget_currency?: string; // USD, INR, etc.

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  manager?: string; // Manager User ID or name

  @IsOptional()
  @IsString()
  teamMembers?: string; // Comma-separated user IDs or names
}
