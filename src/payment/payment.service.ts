import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly axios: HttpService,
    private readonly prisma: PrismaService,
    private config: ConfigService,
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
        amount,
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
}
