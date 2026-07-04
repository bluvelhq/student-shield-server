import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminDto } from 'src/dto/admin.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PrismaService } from 'src/prisma.service';
import {
  InstitutionStatus,
  PaymentStatus,
  Role,
  ServiceRequestStatus,
  SubscriptionStatus,
} from 'prisma/generated/prisma/enums';
import { PlanDto } from 'src/dto/plan.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
    private readonly config: ConfigService,
  ) {}

  async addAdmin(payload: AdminDto, secretCode: string) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (admin) throw new ConflictException('Admin already exists');

    const adminSecretCode = this.config.get<string>('app.adminSecretCode');

    if (adminSecretCode !== secretCode) {
      console.log(secretCode, adminSecretCode);
      throw new UnauthorizedException('Invalid secret code');
    }

    const serviceId = this.helper.generateServiceId();

    // const hashedServiceId = bcrypt.hash(serviceId, 10);
    await this.prisma.admin.create({
      data: {
        email: payload.email,
        serviceId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        privilege: Role.ADMIN,
      },
    });
    return { message: 'Admin created successfully' };
  }

  async removAdmin(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        id,
      },
    });

    if (!admin) throw new NotFoundException('Admin not found');

    await this.prisma.admin.delete({
      where: {
        id,
      },
    });
    return { message: 'Admin removed successfully' };
  }

  async fetchInstitution(institutionId: string) {
    try {
      const institution = await this.prisma.institution.findUnique({
        where: {
          id: institutionId,
        },
      });
      return {
        institution,
      };
    } catch (error) {
      console.log(error);
    }
  }

  async getAllSubscribers(limit?: number, cursor?: string) {
    const take = limit ? Number(limit) : 10;
    const cacheKey = `admin:subscribers:${take}:${cursor || 'none'}`;
    const cached = await this.helper.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryOptions: any = {
        take,
        include: {
          plan: true,
          institution: true,
          devices: true,
        },
        orderBy: {
          id: 'desc',
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const subscribers = await this.prisma.subscriber.findMany(queryOptions);
      const nextCursor =
        subscribers.length === take
          ? subscribers[subscribers.length - 1].id
          : null;

      const response = {
        message: 'Subscribers fetched successfully',
        data: subscribers,
        meta: {
          nextCursor,
          limit: take,
        },
      };

      await this.helper.setCache(cacheKey, response, 60 * 5); // 5 minutes cache
      return response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch subscribers');
    }
  }

  async getTotalRevenue() {
    const cacheKey = 'admin:total_revenue';
    const cached = await this.helper.getCache(cacheKey);
    if (cached !== undefined && cached !== null) {
      return {
        message: 'Total revenue calculated successfully',
        data: cached,
      };
    }

    try {
      const result = await this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: PaymentStatus.SUCCESSFUL,
        },
      });

      const totalRevenue = result._sum.amount || 0;
      await this.helper.setCache(cacheKey, totalRevenue, 60); // 1 minute cache

      return {
        message: 'Total revenue calculated successfully',
        data: totalRevenue,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to calculate total revenue',
      );
    }
  }

  async getAllDevices(limit?: number, cursor?: string) {
    const take = limit ? Number(limit) : 10;
    const cacheKey = `admin:devices:${take}:${cursor || 'none'}`;
    const cached = await this.helper.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryOptions: any = {
        take,
        include: {
          subscriber: true,
          customDeviceAttributes: true,
        },
        orderBy: {
          id: 'desc',
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const devices = await this.prisma.device.findMany(queryOptions);
      const nextCursor =
        devices.length === take ? devices[devices.length - 1].id : null;

      const response = {
        message: 'Devices fetched successfully',
        data: devices,
        meta: {
          nextCursor,
          limit: take,
        },
      };

      await this.helper.setCache(cacheKey, response, 60 * 5); // 5 minutes cache
      return response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch devices');
    }
  }

  async getAllRequests(limit?: number, cursor?: string) {
    const take = limit ? Number(limit) : 10;
    const cacheKey = `admin:requests:${take}:${cursor || 'none'}`;
    const cached = await this.helper.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryOptions: any = {
        take,
        include: {
          subscriber: true,
          device: true,
        },
        orderBy: {
          id: 'desc',
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const requests = await this.prisma.serviceRequest.findMany(queryOptions);
      const nextCursor =
        requests.length === take ? requests[requests.length - 1].id : null;

      const response = {
        message: 'Requests fetched successfully',
        data: requests,
        meta: {
          nextCursor,
          limit: take,
        },
      };

      await this.helper.setCache(cacheKey, response, 60 * 5); // 5 minutes cache
      return response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch requests');
    }
  }

  async getAllPlans(limit?: number, cursor?: string) {
    const take = limit ? Number(limit) : 10;
    const cacheKey = `admin:plans:${take}:${cursor || 'none'}`;
    const cached = await this.helper.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryOptions: any = {
        take,
        orderBy: {
          id: 'asc',
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const plans = await this.prisma.plan.findMany(queryOptions);
      const nextCursor =
        plans.length === take ? plans[plans.length - 1].id : null;

      const response = {
        message: 'Plans fetched successfully',
        data: plans,
        meta: {
          nextCursor,
          limit: take,
        },
      };

      await this.helper.setCache(cacheKey, response, 60 * 60 * 24); // 24 hours cache
      return response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch plans');
    }
  }

  async getAllInstitutions(limit?: number, cursor?: string) {
    const take = limit ? Number(limit) : 10;
    const cacheKey = `admin:institutions:${take}:${cursor || 'none'}`;
    const cached = await this.helper.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryOptions: any = {
        take,
        orderBy: {
          id: 'asc',
        },
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1;
      }

      const institutions = await this.prisma.institution.findMany(queryOptions);
      const nextCursor =
        institutions.length === take
          ? institutions[institutions.length - 1].id
          : null;

      const response = {
        message: 'Institutions fetched successfully',
        data: institutions,
        meta: {
          nextCursor,
          limit: take,
        },
      };

      await this.helper.setCache(cacheKey, response, 60 * 60 * 24); // 24 hours cache
      return response;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch institutions');
    }
  }

  async updateRequestStatus(
    id: string,
    status: ServiceRequestStatus,
    requestId: string,
  ) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: {
          id: id,
        },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const request = await this.prisma.serviceRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status,
        },
        include: {
          subscriber: true,
        },
      });

      // Send status update email to the subscriber
      await this.helper.sendEmail(
        request.subscriber.email,
        'Service Request Status Update - Student Shield',
        'service-status-update',
        {
          firstName: request.subscriber.firstName,
          requestId: request.id,
          requestTitle: request.title,
          newStatus: status,
          currentYear: new Date().getFullYear(),
        },
      );

      // Invalidate relevant cache keys to keep data fresh
      await this.helper.delCache(`request:${requestId}`);
      await this.helper.delCache(`subscriber:requests:${request.subscriberId}`);
      await this.helper.delCache('admin:requests');

      return {
        message: 'Request status updated successfully',
        data: request,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update request status');
    }
  }

  async addPlan(body: PlanDto, id: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: {
          id: id,
        },
      });
      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const plan = await this.prisma.plan.create({
        data: body,
      });
      return {
        message: 'Plan added successfully',
        data: plan,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add plan');
    }
  }

  async updatePlan(planId: string, body: Partial<PlanDto>, adminId: string) {
    try {
      // 1. Authorize Admin
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      // 2. Verify Plan Exists
      const existingPlan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!existingPlan) {
        throw new NotFoundException('Plan not found');
      }

      // 3. Update the Plan
      const updatedPlan = await this.prisma.plan.update({
        where: { id: planId },
        data: body,
      });

      // 4. Invalidate affected Subscriber profile and plan caches
      const subscribers = await this.prisma.subscriber.findMany({
        where: { planId },
        select: { id: true },
      });

      for (const sub of subscribers) {
        await this.helper.delCache(`subscriber:${sub.id}`);
        await this.helper.delCache(`subscriber_plan_${sub.id}`);
      }

      // 5. Invalidate admin lists and plans cache
      await this.helper.delCache('admin:plans:10:none');
      await this.helper.delCache('admin:subscribers:10:none');

      return {
        message: 'Plan updated successfully',
        data: updatedPlan,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update plan');
    }
  }

  async removePlan(planId: string, adminId: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Detach subscribers and payments from the plan to preserve historical data
      await this.prisma.subscriber.updateMany({
        where: { planId },
        data: { planId: null },
      });

      await this.prisma.payment.updateMany({
        where: { planId },
        data: { planId: null },
      });

      await this.prisma.plan.delete({
        where: { id: planId },
      });

      await this.helper.delCache('admin:plans:10:none');

      return {
        message: 'Plan removed successfully',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove plan');
    }
  }

  async bulkExpireSubscription(institutionId: string, adminId: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });

      if (!institution) {
        throw new NotFoundException('Institution not found');
      }

      const subscribers = await this.prisma.subscriber.findMany({
        where: { institutionId },
        select: { id: true },
      });

      if (subscribers.length > 0) {
        // Bulk update statuses
        await this.prisma.subscriber.updateMany({
          where: { institutionId },
          data: {
            subscriptionStatus: SubscriptionStatus.EXPIRED,
          },
        });

        // Bulk notify subscribers
        await this.prisma.notification.createMany({
          data: subscribers.map((sub) => ({
            title: 'Subscription Expired',
            body: 'Your Student Shield subscription has expired. Please renew your plan to reactivate device protection.',
            from: 'System',
            subscriberId: sub.id,
          })),
        });

        // Clear subscriber caches
        for (const sub of subscribers) {
          await this.helper.delCache(`subscriber:${sub.id}`);
          await this.helper.delCache(`subscriber_plan_${sub.id}`);
        }
      }

      await this.helper.delCache('admin:subscribers:10:none');

      return {
        message: `Successfully expired subscription for ${subscribers.length} subscribers.`,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to bulk expire subscriptions',
      );
    }
  }

  async bulkSuspendSubscription(institutionId: string, adminId: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });

      if (!institution) {
        throw new NotFoundException('Institution not found');
      }

      const subscribers = await this.prisma.subscriber.findMany({
        where: { institutionId },
        select: { id: true },
      });

      if (subscribers.length > 0) {
        // Bulk update statuses
        await this.prisma.subscriber.updateMany({
          where: { institutionId },
          data: {
            subscriptionStatus: SubscriptionStatus.SUSPENDED,
          },
        });

        // Bulk notify subscribers
        await this.prisma.notification.createMany({
          data: subscribers.map((sub) => ({
            title: 'Subscription Suspended',
            body: 'Your Student Shield subscription has been suspended by the administrator.',
            from: 'System',
            subscriberId: sub.id,
          })),
        });

        // Clear subscriber caches
        for (const sub of subscribers) {
          await this.helper.delCache(`subscriber:${sub.id}`);
          await this.helper.delCache(`subscriber_plan_${sub.id}`);
        }
      }

      await this.helper.delCache('admin:subscribers:10:none');

      return {
        message: `Successfully suspended subscription for ${subscribers.length} subscribers.`,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to bulk suspend subscriptions',
      );
    }
  }

  async addInstitution(
    body: {
      name: string;
      shortName: string;
      location: string;
      status: InstitutionStatus;
    },
    adminId: string,
  ) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const institution = await this.prisma.institution.create({
        data: {
          name: body.name,
          shortName: body.shortName,
          location: body.location,
          status: body.status || InstitutionStatus.ACTIVE,
        },
      });

      await this.helper.delCache('admin:institutions:10:none');

      return {
        message: 'Institution added successfully',
        data: institution,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Failed to add institution');
    }
  }

  async updateInstitution(
    institutionId: string,
    body: {
      name?: string;
      shortName?: string;
      location?: string;
      status?: InstitutionStatus;
    },
    adminId: string,
  ) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const existingInstitution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });

      if (!existingInstitution) {
        throw new NotFoundException('Institution not found');
      }

      const updatedInstitution = await this.prisma.institution.update({
        where: { id: institutionId },
        data: body,
      });

      await this.helper.delCache('admin:institutions:10:none');

      return {
        message: 'Institution updated successfully',
        data: updatedInstitution,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update institution');
    }
  }

  async removeInstitution(institutionId: string, adminId: string) {
    try {
      const admin = await this.prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.privilege !== Role.ADMIN) {
        throw new UnauthorizedException('Action not permissible');
      }

      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });

      if (!institution) {
        throw new NotFoundException('Institution not found');
      }

      // Check database integrity constraint: Cannot delete if subscribers are linked
      const subscribersCount = await this.prisma.subscriber.count({
        where: { institutionId },
      });

      if (subscribersCount > 0) {
        throw new ConflictException(
          'Cannot delete institution because it contains active subscriber accounts',
        );
      }

      await this.prisma.institution.delete({
        where: { id: institutionId },
      });

      await this.helper.delCache('admin:institutions:10:none');

      return {
        message: 'Institution removed successfully',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove institution');
    }
  }

  async getAdminDetails(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return {
      message: 'Admin details fetched successfully',
      data: admin,
    };
  }
}
