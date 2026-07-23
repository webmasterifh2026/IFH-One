import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';

export class StageActionDto {
  @IsString()
  @IsNotEmpty()
  action: string; // APPROVE, REJECT, HOLD, SUBMIT, MOVE_NEXT

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  vendorId?: string;

  @IsString()
  @IsOptional()
  vendorName?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
