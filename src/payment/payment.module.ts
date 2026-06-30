import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PlanModule } from '../plan/plan.module';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [PlanModule],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService],
})
export class PaymentModule {}
