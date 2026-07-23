import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query('read') read?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.sub;
    // If no auth, return for first active user (dev compatibility)
    if (!userId) {
      return this.notificationsService.findAll('', {
        read,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
      });
    }
    return this.notificationsService.findAll(userId, {
      read,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    const userId = req?.user?.sub || '';
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('inbox-summary')
  getInboxSummary(@Request() req: any) {
    const userId = req?.user?.sub || '';
    return this.notificationsService.getInboxSummary(userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req?.user?.sub || '';
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  markAllRead(@Request() req: any) {
    const userId = req?.user?.sub || '';
    return this.notificationsService.markAllRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @Request() req: any) {
    const userId = req?.user?.sub || '';
    return this.notificationsService.delete(id, userId);
  }
}
