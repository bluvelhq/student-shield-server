import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 24 * 1000,
    }),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 1024 * 1024 * 50,
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
    ConfigModule.forRoot({
      load: [appConfig],
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('brevo.host'),
          port: Number(config.get('brevo.port')),
          secure: true,
          auth: {
            user: config.get('brevo.user'),
            pass: config.get('brevo.pass'),
          },
        },
        defaults: {
          from: config.get('brevo.from'),
        },
        template: {
          dir: join(__dirname, '..', 'views'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
        preview: true,
      }),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: Number(configService.get<string>('app.requestTimeout')),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
