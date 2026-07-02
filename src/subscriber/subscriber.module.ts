import { Module } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { StudentController } from './subscriber.controller';
import { PrismaService } from 'src/prisma.service';
import { PlanModule } from 'src/plan/plan.module';

@Module({
  imports: [PlanModule],
  controllers: [StudentController],
  providers: [SubscriberService, PrismaService],
  exports: [SubscriberService],
})
export class StudentModule {}
