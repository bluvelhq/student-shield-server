import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Skip throttling for OPTIONS preflight requests so CORS headers are returned
    if (request.method === 'OPTIONS') {
      return Promise.resolve(true);
    }
    return super.shouldSkip(context);
  }
}
