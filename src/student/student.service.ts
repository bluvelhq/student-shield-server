import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscriptionStatus } from 'prisma/generated/prisma/enums';
import { DeviceDto } from 'src/dto/devices.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class StudentService {
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

      await this.helper.setCache(cacheKey, subscriber, 60 * 60 * 24 * 1000);
      return {
        message: 'Subscriber details fetched successfully',
        data: subscriber,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Something went wrong while fetching subscriber details',
      );
    }
  }

  async addDevice(
    id: string,
    payload: DeviceDto,
    files?: Express.Multer.File[],
  ) {
    try {
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { id },
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      if (
        subscriber.subscriptionStatus === SubscriptionStatus.EXPIRED ||
        subscriber.subscriptionStatus === SubscriptionStatus.SUSPENDED
      ) {
        throw new UnauthorizedException('No active subscriptions available');
      }

      const subscriberPlan = await this.prisma.plan.findUnique({
        where: {
          id: subscriber.planId!,
        },
      });

      if (!subscriberPlan) {
        throw new NotFoundException('Plan not found');
      }

      if (subscriberPlan.maxDevices <= subscriber.deviceCount) {
        throw new UnauthorizedException('Device limit reached');
      }

      let uploadedFiles: string[] = [];

      if (files) {
        const uploads = await this.helper.uploadMultipleMedia(files, id);
        uploadedFiles = uploads.map((file) => file.url);
      }

      const device = await this.prisma.device.create({
        data: {
          type: payload.type,
          model: payload.model,
          serialCode: payload.serialCode,
          name: payload.name,
          brand: payload.brand,
          os: payload.os,
          media: uploadedFiles,
          customDeviceAttributes: {
            create:
              payload.customDeviceFieldsKeys?.map((key, i) => {
                return {
                  key: key,
                  value: payload.customDeviceFieldsValues?.[i] || '',
                };
              }) || [],
          },
          subscriber: {
            connect: {
              id: subscriber.id,
            },
          },
        },
      });

      // Increment the subscriber's deviceCount
      await this.prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          deviceCount: {
            increment: 1,
          },
        },
      });

      // Clear the cached subscriber details to reflect updated deviceCount
      const cacheKey = `subscriber:${id}`;
      await this.helper.delCache(cacheKey);

      return {
        message: 'Device added successfully',
        data: device,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while adding device',
      );
    }
  }

  async editDevice(
    subscriberId: string,
    deviceId: string,
    payload: Partial<DeviceDto>,
    files?: Express.Multer.File[],
  ) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device || device.subscriberId !== subscriberId) {
        throw new NotFoundException('Device not found');
      }

      let uploadedFiles: string[] = device.media;

      if (files && files.length > 0) {
        const uploads = await this.helper.uploadMultipleMedia(
          files,
          subscriberId,
        );
        const newUrls = uploads.map((file) => file.url);
        uploadedFiles = [...uploadedFiles, ...newUrls];
      }

      const updatedData: any = {
        type: payload.type ?? device.type,
        name: payload.name ?? device.name,
        model: payload.model ?? device.model,
        brand: payload.brand ?? device.brand,
        os: payload.os ?? device.os,
        serialCode: payload.serialCode ?? device.serialCode,
        media: uploadedFiles,
      };

      if (payload.customDeviceFieldsKeys) {
        // Delete existing attributes first to prevent duplicates
        await this.prisma.customDeviceAttribute.deleteMany({
          where: { deviceId },
        });

        updatedData.customDeviceAttributes = {
          create: payload.customDeviceFieldsKeys.map((key, i) => ({
            key,
            value: payload.customDeviceFieldsValues?.[i] || '',
          })),
        };
      }

      const updatedDevice = await this.prisma.device.update({
        where: { id: deviceId },
        data: updatedData,
        include: {
          customDeviceAttributes: true,
        },
      });

      // Clear the cached subscriber details
      await this.helper.delCache(`subscriber:${subscriberId}`);

      return {
        message: 'Device updated successfully',
        data: updatedDevice,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while editing device',
      );
    }
  }

  async removeDevice(subscriberId: string, deviceId: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device || device.subscriberId !== subscriberId) {
        throw new NotFoundException('Device not found');
      }

      // Cleanup related attributes
      await this.prisma.customDeviceAttribute.deleteMany({
        where: { deviceId },
      });

      // Nullify device references in service requests
      await this.prisma.serviceRequest.updateMany({
        where: { deviceId },
        data: { deviceId: null },
      });

      // Delete the device
      await this.prisma.device.delete({
        where: { id: deviceId },
      });

      // Decrement the subscriber's deviceCount
      await this.prisma.subscriber.update({
        where: { id: subscriberId },
        data: {
          deviceCount: {
            decrement: 1,
          },
        },
      });

      // Clear the cached subscriber details
      await this.helper.delCache(`subscriber:${subscriberId}`);

      return {
        message: 'Device removed successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while removing device',
      );
    }
  }

  async getSubscriberDevices(subscriberId: string) {
    const cached = await this.helper.getCache(
      `subscriber:devices:${subscriberId}`,
    );
    if (cached) {
      return {
        message: 'Devices fetched successfully',
        data: cached,
      };
    }
    try {
      const devices = await this.prisma.device.findMany({
        where: {
          subscriberId,
        },
        include: {
          customDeviceAttributes: true,
        },
      });

      await this.helper.setCache(`subscriber:devices:${subscriberId}`, devices);

      return {
        message: 'Devices fetched successfully',
        data: devices,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Something went wrong while fetching subscriber devices',
      );
    }
  }

  async submitRequest() {}

  async updateRequest() {}

  async deleteRequest() {}
}
