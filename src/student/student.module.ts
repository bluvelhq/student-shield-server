import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [],
  controllers: [StudentController],
  providers: [StudentService, PrismaService],
  exports: [StudentService],
})
export class StudentModule {}
