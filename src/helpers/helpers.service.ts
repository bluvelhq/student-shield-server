import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SubscriptionStatus } from 'prisma/generated/prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SupabaseService } from 'src/supabase/supabase.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HelperService {
  logger = new Logger(HelperService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private readonly supabase: SupabaseService,
    private readonly axios: HttpService,
    private readonly config: ConfigService,
  ) {}
  bucketName = 'Student_Shield_Media';

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

  async setCache(cacheKey: string, value: any, ttl?: number) {
    if (!cacheKey) {
      return;
    }

    const actualTTL = ttl || 60 * 60 * 24 * 1000;

    await this.cache.set(cacheKey, value, actualTTL);
  }

  async getCache(cacheKey: string) {
    if (!cacheKey) {
      return;
    }

    return await this.cache.get(cacheKey);
  }

  async delCache(cacheKey: string) {
    if (!cacheKey) {
      return;
    }

    return await this.cache.del(cacheKey);
  }

  async uploadMedia(file: Express.Multer.File, id: string) {
    try {
      const fileName = file.originalname;
      const fileBuffer = file.buffer;
      const fileMimeType = file.mimetype;
      const newFileName = `${id}-${fileName}`;

      const filePath = fileMimeType.startsWith('image/')
        ? `images/${newFileName}`
        : fileMimeType.startsWith('video/')
          ? `videos/${newFileName}`
          : `docs/${newFileName}`;

      const { data, error } = await this.supabase.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: fileMimeType,
        });

      if (error) {
        throw new InternalServerErrorException('Failed to upload media', error);
      }

      const { data: publicData } = this.supabase.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        url: publicData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload media');
    }
  }

  async uploadMultipleMedia(files: Express.Multer.File[], id: string) {
    const uploadPromises = files.map((file) => this.uploadMedia(file, id));
    return Promise.all(uploadPromises);
  }

  async generateQrCode(data: string) {
    try {
      if (!data) {
        throw new BadRequestException('Data required for qr code generation');
      }

      const baseUrl = this.config.get<string>('apiNinjas.baseUrl');
      const apiKey = this.config.get<string>('apiNinjas.apiKey');

      const url = `${baseUrl}/qrcode?data=${data}`;

      const response = await firstValueFrom(
        this.axios.get(url, {
          headers: {
            'X-Api-Key': apiKey,
          },
        }),
      );

      return {
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to generate QR code', error);
      throw new InternalServerErrorException('Failed to generate QR code');
    }
  }
}
