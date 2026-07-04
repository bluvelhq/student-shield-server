import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { SubscriberDto } from 'src/dto/subscriber.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SubscriberService {
  logger = new Logger(SubscriberService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
    private readonly plan: PlanService,
  ) {}

  async getSubscriberDetails(id: string) {
    const cacheKey = `subscriber:${id}`;
    const cached = await this.helper.getCache(cacheKey);

    if (cached) {
      return {
        message: 'Subscriber details fetched successfully',
        data: cached,
      };
    }

    try {
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { id },
        include: {
          plan: true,
          institution: true,
          payments: true,
          devices: true,
          serviceRequests: true,
        },
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      await this.helper.setCache(cacheKey, subscriber, 5 * 60 * 1000);
      return {
        message: 'Subscriber details fetched successfully',
        data: subscriber,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while fetching subscriber details',
      );
    }
  }

  async updateSubscriberDetails(
    id: string,
    payload: Partial<SubscriberDto>,
    file?: Express.Multer.File,
  ) {
    try {
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { id },
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      let profilePictureUrl = subscriber.profilePicture;

      if (file) {
        const uploadResult = await this.helper.uploadMedia(file, id);
        if (!uploadResult) {
          throw new BadRequestException('Failed to upload media');
        }
        profilePictureUrl = uploadResult.url;
      }

      const updatedSubscriber = await this.prisma.subscriber.update({
        where: { id },
        data: {
          firstName: payload.firstName ?? subscriber.firstName,
          lastName: payload.lastName ?? subscriber.lastName,
          phone: payload.phone ?? subscriber.phone,
          gender: payload.gender ?? subscriber.gender,
          residence: payload.residence ?? subscriber.residence,
          level: payload.level ?? subscriber.level,
          profilePicture: profilePictureUrl,
        },
      });

      // Clear the cached subscriber details
      const cacheKey = `subscriber:${id}`;
      await this.helper.delCache(cacheKey);

      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          title: 'Profile Updated',
          body: 'Your profile details have been updated successfully.',
          from: 'System',
          subscriberId: id,
        },
      });

      return {
        message: 'Subscriber details updated successfully',
        data: updatedSubscriber,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Something went wrong while updating subscriber details',
      );
    }
  }
}
