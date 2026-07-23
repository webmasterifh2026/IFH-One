import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { DepartmentStatus } from './department-create.dto';

export class DepartmentUpdateDto {
  @IsString()
  @IsOptional()
  departmentCode?: string;

  @IsString()
  @IsOptional()
  departmentName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string;

  @IsOptional()
  @IsString()
  managerUserId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(DepartmentStatus)
  status?: DepartmentStatus;

  @IsOptional()
  @IsString()
  userIds?: string;
}
