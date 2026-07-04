import { Module } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { SubscriberController } from './subscriber.controller';
import { PrismaService } from 'src/prisma.service';
import { PlanModule } from 'src/plan/plan.module';

@Module({
  imports: [PlanModule],
  controllers: [SubscriberController],
  providers: [SubscriberService, PrismaService],
  exports: [SubscriberService],
})
export class SubscriberModule {}
