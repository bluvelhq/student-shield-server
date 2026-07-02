import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PlanService } from './plan.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('details')
  async fetchPlan(@Query('planId') planId: string) {
    return this.planService.fetchPlan(planId);
  }

  @Get('my-plan')
  @UseGuards(JwtAuthGuard)
  async getSubscriberPlan(@Req() req: AuthenticatedRequest) {
    return this.planService.getSubscriberPlan(req.user.id);
  }

  @Post('renew')
  @UseGuards(JwtAuthGuard)
  async renewPlan(
    @Req() req: AuthenticatedRequest,
    @Query('planId') planId: string,
  ) {
    return this.planService.renewPlan(req.user.id, planId);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  async upgradePlan(
    @Req() req: AuthenticatedRequest,
    @Query('planId') planId: string,
  ) {
    return this.planService.upgradePlan(req.user.id, planId);
  }
}
