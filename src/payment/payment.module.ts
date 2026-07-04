import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PlanModule } from '../plan/plan.module';
import { PrismaService } from 'src/prisma.service';
import { PlanService } from 'src/plan/plan.service';
import { HelperService } from 'src/helpers/helpers.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
  imports: [],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PrismaService,
    PlanService,
    HelperService,
    ConfigService,
    SupabaseService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
