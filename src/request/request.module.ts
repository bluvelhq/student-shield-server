import { Module } from '@nestjs/common';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [],
  controllers: [RequestController],
  providers: [RequestService, PrismaService],
  exports: [RequestService],
})
export class RequestModule {}
