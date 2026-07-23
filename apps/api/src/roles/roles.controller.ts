import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.rolesService.findAll({
      search,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('permissions')
  getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  create(
    @Body() body: { name: string; description?: string; status?: string },
  ) {
    return this.rolesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; status?: string },
  ) {
    return this.rolesService.update(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.rolesService.updateStatus(id, body.status);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Body() body: { name: string }) {
    return this.rolesService.cloneRole(id, body.name);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.rolesService.getPermissions(id);
  }

  @Put(':id/permissions')
  setPermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
    @Req() req: any,
  ) {
    return this.rolesService.setPermissions(
      id,
      body.permissionIds,
      req.user?.id,
    );
  }

  @Get(':id/users')
  getUsers(@Param('id') id: string) {
    return this.rolesService.getUsers(id);
  }

  @Post(':id/users')
  assignUser(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.rolesService.assignUser(id, body.userId);
  }

  @Delete(':id/users/:userId')
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.rolesService.removeUser(id, userId);
  }

  @Get(':id/workflow-stages')
  getWorkflowStages(@Param('id') id: string) {
    return this.rolesService.getWorkflowStages(id);
  }

  @Put(':id/workflow-stages')
  setWorkflowStages(
    @Param('id') id: string,
    @Body()
    body: {
      stages: {
        workflowStage: number;
        canView: boolean;
        canEdit: boolean;
        canApprove: boolean;
        canHold?: boolean;
        canReject?: boolean;
        canBulkUpdate?: boolean;
        canExport?: boolean;
        canReassign?: boolean;
      }[];
    },
    @Req() req: any,
  ) {
    return this.rolesService.setWorkflowStages(id, body.stages, req.user?.id);
  }
}
