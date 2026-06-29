import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma.service';
import { PlanService } from 'src/plan/plan.service';
import { HelperService } from 'src/helpers/helpers.service';

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
  ) {}

  @Post('webhook')
  async webhook(@Req() req: Request, @Res() res: Response) {
    const env = await this.config.get('app.env');
    const payload = req.body as PaystackWebhookPayload;

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
      await this.plan.subscribeToPlan(payload.data?.customer?.email || '');

      await this.prisma.payment.update({
        where: {
          reference: payload.data?.reference || '',
        },
        data: {
          reference: 'null',
        },
      });

      return res.status(200).send('ok');
    }
  }
}
