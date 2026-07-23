import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentCreateDto, DepartmentUpdateDto } from './dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // ─── List All ──────────────────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
    const takeNum = Math.min(take ? parseInt(take) : 10, 100);

    if (takeNum < 1) {
      throw new BadRequestException('Take must be at least 1');
    }

    return this.departmentsService.findAll(
      skipNum,
      takeNum,
      search,
      status,
      sortBy,
      sortOrder,
    );
  }

  // ─── Get Department Hierarchy ──────────────────────────────────────────────
  @Get('hierarchy')
  @HttpCode(HttpStatus.OK)
  async getHierarchy() {
    return this.departmentsService.getDepartmentHierarchy();
  }

  // ─── Get Department Stats ──────────────────────────────────────────────────
  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Param('id') id: string) {
    return this.departmentsService.getDepartmentStats(id);
  }

  // ─── Get Department Users ──────────────────────────────────────────────────
  @Get(':id/users')
  @HttpCode(HttpStatus.OK)
  async getDepartmentUsers(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
    const takeNum = Math.min(take ? parseInt(take) : 10, 100);
    return this.departmentsService.getDepartmentUsers(id, skipNum, takeNum);
  }

  // ─── Get One ────────────────────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: DepartmentCreateDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: DepartmentUpdateDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  // ─── Assign Users to Department ─────────────────────────────────────────────
  @Post(':id/users/assign')
  @HttpCode(HttpStatus.OK)
  async assignUsers(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
  ) {
    return this.departmentsService.assignUsers(id, userIds);
  }

  // ─── Remove Users from Department ───────────────────────────────────────────
  @Delete(':id/users')
  @HttpCode(HttpStatus.OK)
  async removeUsers(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
  ) {
    return this.departmentsService.removeUsers(id, userIds);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.departmentsService.delete(id);
  }
}
