import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SubscriptionStatus,
} from 'prisma/generated/prisma/client';
import { HelperService } from 'src/helpers/helpers.service';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class PlanService {
  logger = new Logger(PlanService.name);
  constructor(
    private prisma: PrismaService,
    private readonly helpers: HelperService,
    private readonly payment: PaymentService,
  ) {}

  async fetchPlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: {
        id: planId,
      },
      include: {
        subscribers: true,
      },
    });

    return plan;
  }

  //   async subscribeToPlan(email: string) {
  //     try {
  //       const subscriber = await this.helpers.fetchSubscriber(email);

  //       if (!subscriber.subscriber) {
  //         throw new NotFoundException('Subscriber not found');
  //       }

  //       const plan = await this.prisma.plan.findUnique({
  //         where: {
  //           id: subscriber.subscriber.planId || '',
  //         },
  //       });

  //       if (!plan) {
  //         throw new NotFoundException('No plan found for subscriber');
  //       }

  //       await this.helpers.sendEmail(
  //         email,
  //         'Welcome to Student Shield!',
  //         'welcome',
  //         {
  //           firstName: subscriber.subscriber.firstName,
  //           serviceId: subscriber.subscriber.serviceId,
  //           currentYear: new Date().getFullYear(),
  //         },
  //       );

  //       // Create in-app notification
  //       await this.prisma.notification.create({
  //         data: {
  //           title: 'Plan Subscribed Successfully',
  //           body: `You have successfully subscribed to the "${plan.type}" plan. Your subscription status is now ACTIVE.`,
  //           from: 'System',
  //           subscriberId: subscriber.subscriber.id,
  //         },
  //       });

  //       return {
  //         message: 'Plan subscribed successfully',
  //       };
  //     } catch (error) {
  //       throw new InternalServerErrorException(
  //         'Something went wrong while subscribing to plan',
  //       );
  //     }
  //   }

  async getSubscriberPlan(id: string) {
    const cacheKey = `subscriber_plan_${id}`;
    const cached = await this.helpers.getCache(cacheKey);

    if (cached) {
      return {
        message: 'Subscriber plan fetched successfully',
        data: cached,
      };
    }

    try {
      const subscriberPlan = await this.prisma.subscriber.findUnique({
        where: {
          id,
        },
        include: {
          plan: true,
          institution: true,
          devices: true,
        },
      });

      if (!subscriberPlan) {
        throw new NotFoundException('Subscriber plan not found');
      }

      this.helpers.setCache(cacheKey, subscriberPlan, 60 * 60 * 24);

      return {
        message: 'Subscriber plan fetched successfully',
        data: subscriberPlan,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Something went wrong while fetching subscriber plan',
      );
    }
  }
  async renewPlan(id: string, planId: string) {
    try {
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { id },
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      if (!planId) {
        throw new BadRequestException('Plan ID not provided');
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      if (planId !== subscriber.planId) {
        throw new BadRequestException('You are not subscribed to this plan');
      }

      if (subscriber.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        throw new ConflictException('Plan has not expired');
      }

      const planFee = plan.fee;
      const data = await this.payment.initializeTransaction(
        subscriber.email,
        planFee,
        ['card', 'bank', 'usdt', 'qr', 'mobile_money'],
      );

      await this.prisma.payment.create({
        data: {
          reference: data.data.reference,
          amount: planFee,
          type: PaymentType.RENEWAL,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MOBILE_MONEY,
          subscriber: {
            connect: {
              id: subscriber.id,
            },
          },
        },
      });

      return {
        data: data,
        message: 'Plan renewal initiated successfully',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to renew plan', error);
      throw new InternalServerErrorException(
        'Something went wrong while renewing the plan',
      );
    }
  }

  async upgradePlan(id: string, planId: string) {
    try {
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { id },
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      if (!planId) {
        throw new BadRequestException('Plan ID not provided');
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      if (planId === subscriber.planId) {
        throw new ConflictException('You are already subscribed to this plan');
      }

      const existingPlan = await this.prisma.plan.findUnique({
        where: {
          id: subscriber.planId || '',
        },
      });

      if (!existingPlan) {
        throw new BadRequestException('You are not subscribed to any plan');
      }

      const amountToPay = plan.fee - existingPlan.fee;
      const data = await this.payment.initializeTransaction(
        subscriber.email,
        amountToPay,
        ['card', 'bank', 'usdt', 'qr', 'mobile_money'],
      );

      await this.prisma.payment.create({
        data: {
          reference: data.data.reference,
          amount: amountToPay,
          type: PaymentType.UPGRADE,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.MOBILE_MONEY,
          subscriber: {
            connect: {
              id: subscriber.id,
            },
          },
        },
      });

      return {
        data: data,
        message: 'Plan upgrade initiated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to upgrade plan', error);
      throw new InternalServerErrorException(
        'Something went wrong while upgrading the plan',
      );
    }
  }
}
