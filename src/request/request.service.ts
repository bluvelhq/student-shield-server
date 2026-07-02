import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'http';
import {
  AccountStatus,
  ServiceRequestStatus,
  SubscriptionStatus,
} from 'prisma/generated/prisma/enums';
import { RequestDto } from 'src/dto/request.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
    private readonly config: ConfigService,
  ) {}

  async makeRequest(id: string, payload: RequestDto, deviceId?: string) {
    try {
      const subscriber = await this.prisma.subscriber.findUnique({
        where: {
          id,
        },
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber with this id does not exist');
      }

      if (subscriber.accountStatus !== AccountStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Subscriber is not active. Please contact the administrator for assistance',
        );
      }

      if (subscriber.subscriptionStatus !== SubscriptionStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Your subscription has expired. Please renew your subscription',
        );
      }

      const requestType = payload.type;

      const subscriberPlan = await this.prisma.plan.findUnique({
        where: {
          id: subscriber.planId || '',
        },
      });

      if (!subscriberPlan) {
        throw new NotFoundException('Subscriber plan not found');
      }

      const planFeatures = subscriberPlan.benefits;

      let isFeatureActive = false;

      for (let i = 0; i < planFeatures.length; i++) {
        const feature = planFeatures[i];
        if (feature === requestType) {
          isFeatureActive = true;
          break;
        }
      }

      if (!isFeatureActive) {
        throw new UnauthorizedException(
          'Requested service not included in your plan',
        );
      }

      const request = await this.prisma.serviceRequest.create({
        data: {
          type: requestType,
          title: payload.title,
          description: payload.description || 'Device description here',
          urgency: payload.urgency,
          businessName: payload.businessName,
          desiredSubdomain: payload.desiredSubdomain,
          websiteConceptDescription: payload.websiteConceptDescription,
          websitePageCount: payload.websitePageCount,
          preferHosting: payload.preferHosting,
          receipt: payload.receipt || 'Receipt here',
          status: ServiceRequestStatus.PENDING,
          device: {
            connect: {
              id: deviceId,
            },
          },
          subscriber: {
            connect: {
              id: subscriber.id,
            },
          },
        },
      });

      //send an email to the admin and subscriber that a new request has been received
      await this.helper.sendEmail(
        subscriber.email,
        'Request Received - Student Shield',
        'subscriber-request-receipt',
        {
          firstName: subscriber.firstName,
          requestId: request.id,
          requestTitle: request.title,
          requestType: request.type,
          requestUrgency: request.urgency,
          currentYear: new Date().getFullYear(),
        },
      );

      const subscriberName = `${subscriber.firstName} ${subscriber.lastName}`;
      const companyEmail = this.config.get<string>('company.email');

      await this.helper.sendEmail(
        companyEmail || 'info@bluvelhq.com',
        'New Service Request Received - Student Shield',
        'admin-request-receipt',
        {
          requestId: request.id,
          subscriberName,
          subscriberEmail: subscriber.email,
          requestTitle: request.title,
          requestType: request.type,
          requestUrgency: request.urgency,
          currentYear: new Date().getFullYear(),
        },
      );

      const env = this.config.get<string>('app.env');

      const devClient = this.config.get<string>('app.devClientUrl');
      const prodClient = this.config.get<string>('app.prodClientUrl');

      const qrCodeUrl = `${env === 'development' ? devClient : prodClient}/request/${request.id}`;

      const qr = await this.helper.generateQrCode(qrCodeUrl);

      await this.prisma.serviceRequest.update({
        where: {
          id: request.id,
        },
        data: {
          qrCode: qr.data,
        },
      });

      return {
        message: 'Request created successfully',
        data: request,
        qrCode: qr,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Something went wrong while creating request',
      );
    }
  }

  async getRequestDetails(requestId: string) {
    const cacheKey = `request:${requestId}`;
    const cached = await this.helper.getCache(cacheKey);

    if (cached) {
      return {
        message: 'Request details fetched successfully',
        data: cached,
      };
    }

    try {
      const serviceRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
        include: {
          subscriber: {
            include: {
              plan: true,
              institution: true,
            },
          },
          device: {
            include: {
              customDeviceAttributes: true,
            },
          },
        },
      });

      if (!serviceRequest) {
        throw new NotFoundException('Request not found');
      }

      await this.helper.setCache(cacheKey, serviceRequest, 60 * 60 * 24 * 1000);

      return {
        message: 'Request details fetched successfully',
        data: serviceRequest,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while fetching request details',
      );
    }
  }

  async getSubscriberRequests(subscriberId: string) {
    const cacheKey = `subscriber:requests:${subscriberId}`;
    const cached = await this.helper.getCache(cacheKey);

    if (cached) {
      return {
        message: 'Requests fetched successfully',
        data: cached,
      };
    }

    try {
      const requests = await this.prisma.serviceRequest.findMany({
        where: { subscriberId },
        include: {
          device: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      await this.helper.setCache(cacheKey, requests, 60 * 60 * 24 * 1000);

      return {
        message: 'Requests fetched successfully',
        data: requests,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Something went wrong while fetching subscriber requests',
      );
    }
  }

  async updateRequest(
    subscriberId: string,
    requestId: string,
    payload: Partial<RequestDto>,
    deviceId?: string,
  ) {
    try {
      const existingRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
      });

      if (!existingRequest || existingRequest.subscriberId !== subscriberId) {
        throw new NotFoundException('Request not found');
      }

      const updatedData: any = {
        title: payload.title ?? existingRequest.title,
        description: payload.description ?? existingRequest.description,
        urgency: payload.urgency ?? existingRequest.urgency,
        businessName: payload.businessName ?? existingRequest.businessName,
        desiredSubdomain:
          payload.desiredSubdomain ?? existingRequest.desiredSubdomain,
        websiteConceptDescription:
          payload.websiteConceptDescription ??
          existingRequest.websiteConceptDescription,
        websitePageCount:
          payload.websitePageCount ?? existingRequest.websitePageCount,
        preferHosting: payload.preferHosting ?? existingRequest.preferHosting,
        receipt: payload.receipt ?? existingRequest.receipt,
      };

      if (deviceId) {
        updatedData.device = {
          connect: {
            id: deviceId,
          },
        };
      }

      const updatedRequest = await this.prisma.serviceRequest.update({
        where: { id: requestId },
        data: updatedData,
        include: {
          device: true,
        },
      });

      // Invalidate caches
      await this.helper.delCache(`request:${requestId}`);
      await this.helper.delCache(`subscriber:requests:${subscriberId}`);

      return {
        message: 'Request updated successfully',
        data: updatedRequest,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while updating request',
      );
    }
  }

  async deleteRequest(subscriberId: string, requestId: string) {
    try {
      const existingRequest = await this.prisma.serviceRequest.findUnique({
        where: { id: requestId },
      });

      if (!existingRequest || existingRequest.subscriberId !== subscriberId) {
        throw new NotFoundException('Request not found');
      }

      await this.prisma.serviceRequest.delete({
        where: { id: requestId },
      });

      // Invalidate caches
      await this.helper.delCache(`request:${requestId}`);
      await this.helper.delCache(`subscriber:requests:${subscriberId}`);

      return {
        message: 'Request deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Something went wrong while deleting request',
      );
    }
  }
}
