import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkMultiStageActionItemDto {
  @IsString()
  @IsNotEmpty()
  procurementId: string;

  // Not restricted to a fixed set here — the valid action set is stage-
  // dependent (APPROVE/REJECT, SUBMIT, PASS/FAIL, AVAILABLE/NOT_AVAILABLE,
  // plus the universal HOLD/RESUME/CLARIFICATION). The real validation
  // happens in resolveStageTransition() against the record's current stage.
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  toFrom?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkMultiStageActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkMultiStageActionItemDto)
  updates: BulkMultiStageActionItemDto[];

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsBoolean()
  @IsOptional()
  notifyUsers?: boolean;
}
