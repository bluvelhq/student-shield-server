import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from 'prisma/generated/prisma/enums';
import { firstValueFrom } from 'rxjs';
import { HelperService } from 'src/helpers/helpers.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly axios: HttpService,
    private readonly prisma: PrismaService,
    private config: ConfigService,
    private readonly helper: HelperService,
  ) {}

  logger = new Logger(PaymentService.name);

  async initializeTransaction(
    email: string,
    amount: number,
    channels: string[],
  ) {
    try {
      const payload = {
        email,
        amount: amount * 100,
        channels,
      };

      const env = this.config.get('app.env');

      const authorization =
        env === 'development'
          ? `Bearer ${this.config.get<string>('paystack.testSecretKey')}`
          : `Bearer ${this.config.get<string>('paystack.liveSecretKey')}`;

      const options = {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      };

      const response = await firstValueFrom(
        this.axios.post(
          `${this.config.get('paystack.baseUrl')}/transaction/initialize`,
          payload,
          options,
        ),
      );

      if (response.data.status === true) {
        return response.data;
      }

      throw new Error(response.data.message);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to initialize transaction',
      );
    }
  }

  async verifyTransaction(reference: string) {
    try {
      const env = this.config.get('app.env');

      const authorization =
        env === 'development'
          ? `Bearer ${this.config.get<string>('paystack.testSecretKey')}`
          : `Bearer ${this.config.get<string>('paystack.liveSecretKey')}`;

      const options = {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
      };

      const response = await firstValueFrom(
        this.axios.get(
          `${this.config.get('paystack.baseUrl')}/transaction/verify/${reference}`,
          options,
        ),
      );

      if (response.data.status === true) {
        return response.data;
      }

      throw new Error(response.data.message);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to initialize transaction',
      );
    }
  }

  async generateRetryCheckoutUrl(
    email: string,
    amount: number,
    reference: string,
  ) {
    try {
      const transaction = await this.initializeTransaction(email, amount, [
        'card',
        'bank',
        'usdt',
        'qr',
        'mobile_money',
      ]);

      await this.prisma.payment.update({
        where: {
          reference,
        },
        data: {
          reference: transaction.data.reference,
          amount: amount,
          status: PaymentStatus.PENDING,
        },
      });

      return transaction.data.authorization_url;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Failed to generate checkout URL');
    }
  }

  async fetchSubscriberPaymentRecords(subscriberId: string) {
    try {
      const cached = await this.helper.getCache(`payments:${subscriberId}`);
      if (cached) {
        return {
          message: 'Payment records fetched successfully',
          data: cached,
        };
      }
      const payments = await this.prisma.payment.findMany({
        where: {
          subscriberId,
        },
        include: {
          plan: true,
        },
      });

      if (!payments) {
        throw new NotFoundException(
          'No payment records found for this subscriber',
        );
      }

      await this.helper.setCache(`payments:${subscriberId}`, payments, 60);

      return {
        message: 'Payment records fetched successfully',
        data: payments,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to fetch subscriber payment details',
      );
    }
  }
}
