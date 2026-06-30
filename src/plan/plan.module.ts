import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [],
  controllers: [],
  providers: [PlanService, PrismaService],
  exports: [PlanService],
})
export class PlanModule {}
