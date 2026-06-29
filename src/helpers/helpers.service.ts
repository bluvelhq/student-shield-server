import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  Plan,
  Subscriber,
  SubscriptionStatus,
} from 'prisma/generated/prisma/client';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class HelperService {
  logger = new Logger(HelperService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  generateServiceId() {
    const prefix = 'SRV-';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let result = '';

    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return prefix + result;
  }

  generateDeviceId() {
    const prefix = 'DEV-';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let result = '';

    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return prefix + result;
  }

  async fetchSubscriber(email: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: {
        email,
      },
      include: {
        plan: true,
        institution: true,
        payments: true,
        devices: true,
        serviceRequests: true,
      },
    });

    return {
      subscriber,
    };
  }

  async checkSubscriptionStatus(email: string): Promise<boolean> {
    const subscriber = await this.fetchSubscriber(email);

    if (!subscriber.subscriber) {
      return false;
    }

    if (
      subscriber.subscriber?.subscriptionStatus === SubscriptionStatus.PENDING
    ) {
      return false;
    }

    if (
      subscriber.subscriber?.subscriptionStatus === SubscriptionStatus.EXPIRED
    ) {
      return false;
    }
    return true;
  }

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
    attachments?: Array<{ filename: string; path: string; cid: string }>,
  ) {
    try {
      const response = await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
        attachments,
      });
      return response;
    } catch (error) {
      this.logger.error('Email sending failed', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
