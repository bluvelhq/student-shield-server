import {
  BadGatewayException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccountStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  SubscriptionStatus,
} from 'prisma/generated/prisma/enums';
import { AdminService } from 'src/admin/admin.service';
import { SubscriberDto } from 'src/dto/subscriber.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PaymentService } from 'src/payment/payment.service';
import { PlanService } from 'src/plan/plan.service';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: HelperService,
    private readonly plan: PlanService,
    private readonly admin: AdminService,
    private readonly payment: PaymentService,
    private readonly jwt: JwtService,
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

      const serviceId = this.helpers.generateServiceId();
      const hashedServiceId = await bcrypt.hash(serviceId, 10);

      await this.prisma.subscriber.create({
        data: {
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          studentId: payload.studentId,
          level: payload.level,
          phone: payload.phone,
          serviceId: hashedServiceId,
          residence: payload.residence,
          institutionId: institutionId,
          planId: planId,
          gender: payload.gender,
          role: Role.SUBSCRIBER,
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

  async login(serviceId: string, privilege: Role) {
    try {
      let subscriber;

      if (privilege === Role.SUBSCRIBER) {
        subscriber = await this.prisma.subscriber.findUnique({
          where: {
            serviceId,
          },
          include: {
            plan: true,
            institution: true,
          },
        });
      } else if (privilege === Role.ADMIN) {
        subscriber = await this.prisma.admin.findUnique({
          where: {
            serviceId,
          },
        });
      }

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      if (
        privilege === Role.SUBSCRIBER &&
        subscriber.subscriptionStatus === SubscriptionStatus.PENDING
      ) {
        throw new UnauthorizedException('No active subscription found');
      }

      if (
        privilege !== Role.ADMIN &&
        (subscriber.accountStatus === AccountStatus.INACTIVE ||
          subscriber.accountStatus === AccountStatus.SUSPENDED)
      ) {
        throw new UnauthorizedException('Account is not accessible');
      }

      const isServiceIdMatching = await bcrypt.compare(
        serviceId,
        subscriber.serviceId,
      );

      if (!isServiceIdMatching) {
        throw new UnauthorizedException('Invalid service ID');
      }

      const { id, role, profilePicture } = subscriber;

      const token = this.jwt.sign({
        id,
        serviceId: subscriber.serviceId,
        role,
        profilePicture,
      });

      if (role === Role.SUBSCRIBER) {
        await this.prisma.subscriber.update({
          where: {
            serviceId,
          },
          data: {
            lastLoginAt: new Date().toISOString(),
          },
        });
      } else if (role === Role.ADMIN) {
        await this.prisma.admin.update({
          where: {
            serviceId,
          },
          data: {
            lastLoginAt: new Date().toISOString(),
          },
        });
      }

      return {
        message: 'Login successful',
        data: subscriber,
        token,
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Login failed, please try again');
    }
  }

  async logout(id: string, role: Role) {
    if (role === Role.SUBSCRIBER) {
      await this.prisma.subscriber.update({
        where: {
          id,
        },
        data: {
          lastActiveAt: new Date().toISOString(),
        },
      });
    } else if (role === Role.ADMIN) {
      await this.prisma.admin.update({
        where: {
          id,
        },
        data: {
          lastActiveAt: new Date().toISOString(),
        },
      });
    }
    return {
      message: 'Logout successful',
    };
  }

  async resetPassword(email: string, role: Role) {
    try {
      const newServiceId = this.helpers.generateServiceId();
      const hashedServiceId = await bcrypt.hash(newServiceId, 10);
      let firstName = 'User';

      if (role === Role.SUBSCRIBER) {
        const subscriber = await this.prisma.subscriber.findUnique({
          where: { email },
        });
        if (!subscriber) throw new NotFoundException('Subscriber not found');

        firstName = subscriber.firstName;

        await this.prisma.subscriber.update({
          where: { email },
          data: { serviceId: hashedServiceId },
        });
      } else if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
        const admin = await this.prisma.admin.findUnique({
          where: { email },
        });
        if (!admin) throw new NotFoundException('Admin not found');

        firstName = admin.firstName;

        await this.prisma.admin.update({
          where: { email },
          data: { serviceId: hashedServiceId },
        });
      } else {
        throw new NotFoundException('Invalid role specified');
      }

      await this.helpers.sendEmail(
        email,
        'Your Login Service ID Has Been Reset - Student Shield',
        'service-id-reset',
        {
          firstName,
          serviceId: newServiceId,
          currentYear: new Date().getFullYear(),
        },
      );

      return {
        message: 'Password reset successfully. Check your email for details.',
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Password reset failed');
    }
  }

  async removeAccount(id: string, role: Role) {
    try {
      if (role === Role.SUBSCRIBER) {
        const subscriber = await this.prisma.subscriber.findUnique({
          where: { id },
        });
        if (!subscriber) throw new NotFoundException('Subscriber not found');

        // Soft delete the subscriber
        await this.prisma.subscriber.update({
          where: { id },
          data: {
            accountStatus: AccountStatus.DELETED,
          },
        });
      } else if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
        const admin = await this.prisma.admin.findUnique({
          where: { id },
        });
        if (!admin) throw new NotFoundException('Admin not found');

        // Hard delete the admin (no accountStatus field on Admin)
        await this.prisma.admin.delete({
          where: { id },
        });
      } else {
        throw new NotFoundException('Invalid role specified');
      }

      return {
        message: 'Account removed successfully',
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to remove account');
    }
  }

  async deactivateAccount(id: string, role: Role) {
    try {
      if (role === Role.SUBSCRIBER) {
        const subscriber = await this.prisma.subscriber.findUnique({
          where: { id },
        });
        if (!subscriber) throw new NotFoundException('Subscriber not found');

        await this.prisma.subscriber.update({
          where: { id },
          data: {
            accountStatus: AccountStatus.INACTIVE,
          },
        });
      } else if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
        throw new UnauthorizedException('Admin accounts cannot be deactivated');
      } else {
        throw new NotFoundException('Invalid role specified');
      }

      return {
        message: 'Account deactivated successfully',
      };
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to deactivate account');
    }
  }

  async requestPasswordResetToken(email: string, role: Role) {
    return this.resetPassword(email, role);
  }
}
