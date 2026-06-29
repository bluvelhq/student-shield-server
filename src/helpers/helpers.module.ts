import { Module } from '@nestjs/common';
import { HelperService } from './helpers.service';

@Module({
  imports: [],
  providers: [HelperService],
  controllers: [],
})
export class HelperModule {}
