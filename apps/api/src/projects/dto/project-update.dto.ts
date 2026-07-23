import {
  IsString,
  IsOptional,
  IsDateString,
  IsDecimal,
  IsEnum,
} from 'class-validator';
import { ProjectStatus } from './project-create.dto';

export class ProjectUpdateDto {
  @IsString()
  @IsOptional()
  projectCode?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

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
  budget?: number;

  @IsOptional()
  @IsString()
  budget_currency?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  manager?: string;

  @IsOptional()
  @IsString()
  teamMembers?: string;
}
