import { Controller, Post, Body, Param, Request } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { SubmitInspectionDto } from './dto/inspections.dto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post(':procurementId/level1')
  @RequirePermissions('inspections.l1')
  submitLevel1(
    @Param('procurementId') procurementId: string,
    @Body() dto: SubmitInspectionDto,
    @Request() req: any,
  ) {
    return this.inspectionsService.processInspection(
      procurementId,
      1,
      dto,
      req.user.sub,
    );
  }

  @Post(':procurementId/level2')
  @RequirePermissions('inspections.l2')
  submitLevel2(
    @Param('procurementId') procurementId: string,
    @Body() dto: SubmitInspectionDto,
    @Request() req: any,
  ) {
    return this.inspectionsService.processInspection(
      procurementId,
      2,
      dto,
      req.user.sub,
    );
  }

  @Post(':procurementId/level3')
  @RequirePermissions('inspections.l3')
  submitLevel3(
    @Param('procurementId') procurementId: string,
    @Body() dto: SubmitInspectionDto,
    @Request() req: any,
  ) {
    return this.inspectionsService.processInspection(
      procurementId,
      3,
      dto,
      req.user.sub,
    );
  }
}
