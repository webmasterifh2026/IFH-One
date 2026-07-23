import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum DepartmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class DepartmentCreateDto {
  @IsString()
  departmentName: string;

  @IsOptional()
  @IsString()
  departmentCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string; // For organization hierarchy

  @IsOptional()
  @IsString()
  managerUserId?: string; // Manager User ID

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(DepartmentStatus)
  status?: DepartmentStatus;

  @IsOptional()
  @IsString()
  userIds?: string; // Comma-separated user IDs for initial assignment
}
