import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { PrismaService } from 'src/prisma.service';
import { HelperService } from 'src/helpers/helpers.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
  imports: [],
  controllers: [DeviceController],
  providers: [
    DeviceService,
    PrismaService,
    HelperService,
    PrismaService,
    ConfigService,
    SupabaseService,
  ],
  exports: [DeviceService],
})
export class DeviceModule {}
