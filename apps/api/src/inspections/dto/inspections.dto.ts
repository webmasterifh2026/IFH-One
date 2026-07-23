import {
  IsArray,
  IsString,
  IsIn,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class InspectionItemDto {
  @IsString()
  procurementItemId: string;

  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SubmitInspectionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items: InspectionItemDto[];
}
