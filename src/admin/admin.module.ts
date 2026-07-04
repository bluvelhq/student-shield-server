import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from 'src/prisma.service';
import { HelperService } from 'src/helpers/helpers.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'src/supabase/supabase.service';
@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    PrismaService,
    HelperService,
    ConfigService,
    SupabaseService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
