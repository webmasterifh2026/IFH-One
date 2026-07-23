import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Public()
  @Get('public-stats')
  getPublicStats() {
    return this.usersService.getPublicStats();
  }

  @Patch(':id/password')
  changePassword(@Param('id') id: string, @Body() data: any) {
    return this.usersService.changePassword(id, data);
  }

  @Patch(':id/preferences')
  updatePreferences(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updatePreferences(id, data);
  }

  @Get(':id/sessions')
  getSessions(@Param('id') id: string) {
    return this.usersService.getSessions(id);
  }

  @Delete(':id/sessions/:sessionId')
  revokeSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.usersService.revokeSession(id, sessionId);
  }

  @Get(':id/analytics')
  getAnalytics(@Param('id') id: string) {
    return this.usersService.getAnalytics(id);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.usersService.getPermissions(id);
  }

  @Get(':id/statistics')
  getUserStatistics(@Param('id') id: string) {
    return this.usersService.getUserStatistics(id);
  }

  @Get(':id/activity')
  getUserActivity(@Param('id') id: string) {
    return this.usersService.getUserActivity(id);
  }

  @Get(':id/charts')
  getCharts(@Param('id') id: string) {
    return this.usersService.getCharts(id);
  }

  @Get(':id/achievements')
  getAchievements(@Param('id') id: string) {
    return this.usersService.getAchievements(id);
  }

  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
  }

  @Post(':id/unlock')
  unlock(@Param('id') id: string) {
    return this.usersService.unlock(id);
  }
}
