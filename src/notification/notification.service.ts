import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { HelperService } from 'src/helpers/helpers.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
  ) {}

  async createNotification(payload: {
    title: string;
    body?: string;
    from?: string;
    subscriberId?: string;
    adminId?: string;
  }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          title: payload.title,
          body: payload.body,
          from: payload.from || 'System',
          subscriberId: payload.subscriberId,
          adminId: payload.adminId,
        },
      });

      if (payload.subscriberId) {
        await this.helper.delCache(
          `notifications:subscriber:${payload.subscriberId}`,
        );
      }
      if (payload.adminId) {
        await this.helper.delCache(`notifications:admin:${payload.adminId}`);
      }

      return {
        message: 'Notification created successfully',
        data: notification,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  async getUserNotifications(userId: string, role: 'SUBSCRIBER' | 'ADMIN') {
    const cacheKey = `notifications:${role.toLowerCase()}:${userId}`;
    const cached = await this.helper.getCache(cacheKey);

    if (cached) {
      return {
        message: 'Notifications fetched successfully',
        data: cached,
      };
    }

    try {
      const whereClause: any = {
        isDeleted: false,
      };

      if (role === 'SUBSCRIBER') {
        whereClause.subscriberId = userId;
      } else {
        whereClause.adminId = userId;
      }

      const notifications = await this.prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
      });

      await this.helper.setCache(cacheKey, notifications, 60 * 10 * 1000); // 10 minutes cache

      return {
        message: 'Notifications fetched successfully',
        data: notifications,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch user notifications',
      );
    }
  }

  async readNotification(notificationId: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          isSeen: true,
        },
      });

      // Invalidate caches
      if (notification.subscriberId) {
        await this.helper.delCache(
          `notifications:subscriber:${notification.subscriberId}`,
        );
      }
      if (notification.adminId) {
        await this.helper.delCache(
          `notifications:admin:${notification.adminId}`,
        );
      }

      return {
        message: 'Notification marked as read',
        data: updatedNotification,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Failed to mark notification as read',
      );
    }
  }

  async readAllNotification(userId: string, role: 'SUBSCRIBER' | 'ADMIN') {
    try {
      const whereClause: any = {
        isRead: false,
        isDeleted: false,
      };

      if (role === 'SUBSCRIBER') {
        whereClause.subscriberId = userId;
      } else {
        whereClause.adminId = userId;
      }

      await this.prisma.notification.updateMany({
        where: whereClause,
        data: {
          isRead: true,
          isSeen: true,
        },
      });

      // Invalidate cache
      await this.helper.delCache(
        `notifications:${role.toLowerCase()}:${userId}`,
      );

      return {
        message: 'All notifications marked as read',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to mark all notifications as read',
      );
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isDeleted: true,
        },
      });

      // Invalidate cache
      if (notification.subscriberId) {
        await this.helper.delCache(
          `notifications:subscriber:${notification.subscriberId}`,
        );
      }
      if (notification.adminId) {
        await this.helper.delCache(
          `notifications:admin:${notification.adminId}`,
        );
      }

      return {
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to delete notification');
    }
  }
}
