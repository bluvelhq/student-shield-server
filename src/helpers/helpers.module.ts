import { Global, Module } from '@nestjs/common';
import { HelperService } from './helpers.service';
import { PrismaService } from 'src/prisma.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Global()
@Module({
  imports: [],
  providers: [HelperService, PrismaService, SupabaseService],
  controllers: [],
  exports: [HelperService],
})
export class HelperModule {}
