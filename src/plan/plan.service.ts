import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Plan, SubscriptionStatus } from 'prisma/generated/prisma/client';
import { HelperService } from 'src/helpers/helpers.service';

@Injectable()
export class PlanService {
  constructor(
    private prisma: PrismaService,
    private readonly helpers: HelperService,
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

  async subscribeToPlan(email: string) {
    const subscriber = await this.helpers.fetchSubscriber(email);

    if (!subscriber.subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    const plan = await this.prisma.plan.findUnique({
      where: {
        id: subscriber.subscriber.planId || '',
      },
    });

    if (!plan) {
      throw new NotFoundException('No plan found for subscriber');
    }

    const serviceId = this.helpers.generateServiceId();

    const updatedSubscriber = await this.prisma.subscriber.update({
      where: {
        email,
      },
      data: {
        serviceId,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        plan: {
          connect: {
            id: plan.id,
          },
        },
      },
    });

    await this.helpers.sendEmail(
      email,
      'Welcome to Student Shield!',
      'welcome',
      {
        firstName: updatedSubscriber.firstName,
        serviceId,
        currentYear: new Date().getFullYear(),
      },
    );

    return {
      message: 'Plan subscribed successfully',
    };
  }

  async renewPlan() {}
}
