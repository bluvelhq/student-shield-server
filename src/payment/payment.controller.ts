import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { PlanService } from 'src/plan/plan.service';
import { HelperService } from 'src/helpers/helpers.service';
import { PaymentService } from './payment.service';
import { PaymentStatus } from 'prisma/generated/prisma/enums';

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    reference?: string;
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

    if (!secret) throw new Error('Paystack secret key not found');

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
      throw new Error('Invalid webhook signature');
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

      if (!subscriber.subscriber || !payment)
        throw new Error('Subscriber not found');

      const isValidTransaction = await this.payment.verifyTransaction(
        payload.data?.reference || '',
      );

      if (!isValidTransaction.status) {
        return res.status(200).send('ok');
      }

      await this.plan.subscribeToPlan(payload.data?.customer?.email || '');

      await this.prisma.payment.update({
        where: {
          reference: payload.data?.reference || '',
        },
        data: {
          status: PaymentStatus.SUCCESSFUL,
        },
      });

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
        throw new Error('Payment or Subscriber not found');
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
}
