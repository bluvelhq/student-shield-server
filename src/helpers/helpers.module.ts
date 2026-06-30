import { Global, Module } from '@nestjs/common';
import { HelperService } from './helpers.service';

@Global()
@Module({
  imports: [],
  providers: [HelperService],
  controllers: [],
  exports: [HelperService],
})
export class HelperModule {}
