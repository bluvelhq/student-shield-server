import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'prisma/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Req() req: AuthenticatedRequest) {
    // Map JWT role string to Prisma Role enum
    const role = req.user.role === 'admin' ? Role.ADMIN : Role.SUBSCRIBER;
    return this.notificationService.getUserNotifications(req.user.id, role);
  }

  @Patch('read')
  async readNotification(@Query('notificationId') notificationId: string) {
    return this.notificationService.readNotification(notificationId);
  }

  @Patch('read-all')
  async readAllNotifications(@Req() req: AuthenticatedRequest) {
    const role = req.user.role === 'admin' ? Role.ADMIN : Role.SUBSCRIBER;
    return this.notificationService.readAllNotification(req.user.id, role);
  }

  @Delete('delete')
  async deleteNotification(@Query('notificationId') notificationId: string) {
    return this.notificationService.deleteNotification(notificationId);
  }
}
