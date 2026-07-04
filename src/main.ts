import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configDotenv } from 'dotenv';
import { join } from 'path';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

configDotenv();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  //enable versioning (use the URI version)
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  //setup MVC
  app.useStaticAssets(join(process.cwd(), 'public'));
  app.setBaseViewsDir(join(process.cwd(), 'views'));
  app.setViewEngine('hbs');

  //enable helmet
  // app.use(helmet());

  //enable cors
  app.enableCors({
    origin: ['http://localhost:3000', 'https://shield.bluvelhq.com'],
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
  });

  //set global prefix
  app.setGlobalPrefix('api');

  //set global class validators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  //trust proxies
  app.set('trust proxy', 'loopback');

  //setup swagger
  const config = new DocumentBuilder()
    .setTitle('Student Shield Server')
    .setDescription('The Student Shield API description')
    .setVersion('1.0')
    .addTag('student')
    .addTag('auth')
    .addTag('user')
    .addTag('role')
    .addTag('permission')
    .addTag('device')
    .addTag('location')
    .addTag('notification')
    .addTag('alert')
    .addTag('sos')
    .addTag('dashboard')
    .addTag('report')
    .addTag('setting')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
