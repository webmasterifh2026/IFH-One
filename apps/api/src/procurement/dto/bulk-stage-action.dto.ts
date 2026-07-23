import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkStageActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  procurementIds: string[];

  @IsString()
  @IsNotEmpty()
  action: string; // APPROVE, REJECT, HOLD, SUBMIT, MOVE_NEXT, etc.

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsBoolean()
  @IsOptional()
  notifyUsers?: boolean;

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;

  @IsString()
  @IsOptional()
  assignedToId?: string;
}
