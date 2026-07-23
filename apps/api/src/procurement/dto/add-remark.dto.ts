import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';

export class AddRemarkDto {
  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsNumber()
  @IsOptional()
  stageNumber?: number;
}
