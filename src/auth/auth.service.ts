import {
  BadGatewayException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
} from 'prisma/generated/prisma/enums';
import { AdminService } from 'src/admin/admin.service';
import { SubscriberDto } from 'src/dto/subscriber.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PaymentService } from 'src/payment/payment.service';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: HelperService,
    private readonly plan: PlanService,
    private readonly admin: AdminService,
    private readonly payment: PaymentService,
  ) {}

  logger = new Logger(AuthService.name);

  async subscribe(
    payload: SubscriberDto,
    planId: string,
    institutionId: string,
  ) {
    try {
      const subscriber = await this.helpers.fetchSubscriber(payload.email);

      if (subscriber.subscriber) {
        throw new ConflictException('User already exists');
      }

      const plan = await this.plan.fetchPlan(planId);

      if (!plan) {
        throw new NotFoundException('Plan does not exist');
      }

      const institution = await this.admin.fetchInstitution(institutionId);
      if (!institution) {
        throw new NotFoundException('Institution does not exist');
      }

      plan.subscribers.map((user) => {
        if (user.id === subscriber.subscriber?.id) {
          throw new ConflictException(
            'You are already subscribed to this plan',
          );
        }
      });

      const data = await this.payment.initializeTransaction(
        payload.email,
        plan.fee,
        ['mobile_money', 'card'],
      );

      const addSubscriber = await this.prisma.subscriber.create({
        data: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          studentId: payload.studentId,
          level: payload.level,
          phone: payload.phone,
          serviceId: this.helpers.generateServiceId(),
          residence: payload.residence,
          institutionId: institutionId,
          planId: planId,
          gender: payload.gender,
          subscriptionStatus: SubscriptionStatus.PENDING,
          payments: {
            create: {
              amount: plan.fee,
              method: PaymentMethod.MOBILE_MONEY,
              reference: data.reference,
              status: PaymentStatus.PENDING,
            },
          },
        },
      });

      return {
        message: 'Please complete your payment to subscribe',
        data,
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Subscription failed, please try again',
      );
    }
  }

  async login() {}

  async logout() {}

  async resetPassword() {}

  async removeAccount() {}

  async deactivateAccount() {}

  async requestPasswordResetToken() {}
}
