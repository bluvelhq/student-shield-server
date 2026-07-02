import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [],
  controllers: [],
  providers: [NotificationService, PrismaService],
  exports: [NotificationService],
})
export class NotificationModule {}
