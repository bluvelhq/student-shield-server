import {
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { PlanService } from 'src/plan/plan.service';
import { HelperService } from 'src/helpers/helpers.service';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SubscriptionStatus,
} from 'prisma/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    reference?: string;
    channel?: string;
    customer?: {
      email?: string;
    };
  };
};

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly plan: PlanService,
    private readonly helper: HelperService,
    private readonly payment: PaymentService,
  ) {}

  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    const env = await this.config.get('app.env');
    const payload = req.body as PaystackWebhookPayload;

    const secret =
      env === 'development'
        ? this.config.get<string>('paystack.testSecretKey')
        : this.config.get<string>('paystack.liveSecretKey');

    if (!secret) return res.status(401).send('Paystack secret key not found');

    const maybeRawBody: unknown = (req as unknown as { rawBody?: unknown })
      .rawBody;

    const rawBody: Buffer = Buffer.isBuffer(maybeRawBody)
      ? maybeRawBody
      : Buffer.from(JSON.stringify(req.body));

    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('Invalid webhook signature');
    }

    if (payload.event === 'charge.success') {
      const payment = await this.prisma.payment.findUnique({
        where: {
          reference: payload.data?.reference || '',
        },
      });

      const subscriber = await this.helper.fetchSubscriber(
        payload.data?.customer?.email || '',
      );

      if (!subscriber.subscriber || !payment) {
        return res.status(404).send('Subscriber or payment record not found');
      }
      const isValidTransaction = await this.payment.verifyTransaction(
        payload.data?.reference || '',
      );

      if (!isValidTransaction.status) {
        return res.status(200).send('ok');
      }

      let planIdToConnect = subscriber.subscriber.planId || '';

      if (payment.type === PaymentType.UPGRADE && payment.planId) {
        planIdToConnect = payment.planId;
        await this.prisma.subscriber.update({
          where: {
            id: subscriber.subscriber.id,
          },
          data: {
            planId: payment.planId,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
          },
        });
      } else {
        await this.prisma.subscriber.update({
          where: {
            id: subscriber.subscriber.id,
          },
          data: {
            subscriptionStatus: SubscriptionStatus.ACTIVE,
          },
        });
      }

      await this.helper.delCache(`subscriber:${subscriber.subscriber.id}`);
      await this.helper.delCache(`subscriber_plan_${subscriber.subscriber.id}`);

      await this.prisma.payment.update({
        where: {
          reference: payload.data?.reference || '',
        },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          method: payload.data?.channel?.toUpperCase() as PaymentMethod,
          plan: {
            connect: {
              id: planIdToConnect,
            },
          },
        },
      });

      // Send email notification (non-blocking — don't let email failures crash the webhook)
      try {
        if (payment.type === PaymentType.NEW) {
          await this.helper.sendEmail(
            subscriber.subscriber.email,
            'Welcome to Student Shield!',
            'welcome',
            {
              firstName: subscriber.subscriber.firstName,
              serviceId: subscriber.subscriber.serviceId,
              currentYear: new Date().getFullYear(),
            },
          );
        } else if (payment.type === PaymentType.RENEWAL) {
          await this.helper.sendEmail(
            subscriber.subscriber.email,
            'Subscription Renewed - Student Shield',
            'renewal-message',
            {
              firstName: subscriber.subscriber.firstName,
              planName: subscriber.subscriber.plan?.type || 'Standard',
              amount: payment.amount,
              reference: payment.reference,
              currentYear: new Date().getFullYear(),
            },
          );
        } else if (payment.type === PaymentType.UPGRADE) {
          const upgradedPlan = await this.prisma.plan.findUnique({
            where: { id: planIdToConnect },
          });

          await this.helper.sendEmail(
            subscriber.subscriber.email,
            'Plan Upgraded - Student Shield',
            'upgrade-message',
            {
              firstName: subscriber.subscriber.firstName,
              planName: upgradedPlan?.type || 'Premium',
              amount: payment.amount,
              reference: payment.reference,
              currentYear: new Date().getFullYear(),
            },
          );
        }
      } catch (emailError) {
        console.error('Webhook email notification failed (non-fatal):', emailError);
      }

      return res.status(200).send('ok');
    }
    if (payload.event === 'charge.failed') {
      const payment = await this.prisma.payment.findUnique({
        where: {
          reference: payload.data?.reference || '',
        },
        include: {
          subscriber: true,
        },
      });

      if (!payment || !payment.subscriber) {
        return res.status(404).send('Payment or Subscriber not found');
      }

      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      const checkoutUrl = await this.payment.generateRetryCheckoutUrl(
        payment.subscriber.email,
        payment.amount,
        payment.reference,
      );

      await this.helper.sendEmail(
        payment.subscriber.email,
        'Payment Failed - Complete Your Student Shield Subscription',
        'retry-payment',
        {
          firstName: payment.subscriber.firstName,
          checkoutUrl,
          amount: payment.amount,
          currentYear: new Date().getFullYear(),
        },
      );

      return res.status(200).send('ok');
    }
  }

  @Post('retry-checkout')
  @UseGuards(JwtAuthGuard)
  async retryCheckout(
    @Req() req: AuthenticatedRequest,
    @Query('reference') reference: string,
    @Query('amount') amount: number,
  ) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id: req.user.id },
    });

    if (!subscriber) throw new NotFoundException('Subscriber not found');

    const checkoutUrl = await this.payment.generateRetryCheckoutUrl(
      subscriber.email,
      Number(amount),
      reference,
    );

    return {
      message: 'Retry checkout URL generated successfully',
      checkoutUrl,
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async fetchSubscriberPaymentRecords(@Req() req: AuthenticatedRequest) {
    return this.payment.fetchSubscriberPaymentRecords(req.user.id);
  }

  @Post('dev-activate-payment')
  async devActivatePayment(@Query('reference') reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: { subscriber: { include: { plan: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const planIdToConnect = payment.planId || payment.subscriber.planId || '';

    if (payment.type === PaymentType.UPGRADE && payment.planId) {
      await this.prisma.subscriber.update({
        where: { id: payment.subscriber.id },
        data: {
          planId: payment.planId,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });
    } else {
      await this.prisma.subscriber.update({
        where: { id: payment.subscriber.id },
        data: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });
    }

    await this.prisma.payment.update({
      where: { reference },
      data: {
        status: PaymentStatus.SUCCESSFUL,
        method: PaymentMethod.MOBILE_MONEY,
        plan: {
          connect: {
            id: planIdToConnect,
          },
        },
      },
    });

    return {
      message: 'Dev payment activation successful',
      payment,
    };
  }
}
