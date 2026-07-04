import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AdminDto } from 'src/dto/admin.dto';
import { PlanDto } from 'src/dto/plan.dto';
import {
  InstitutionStatus,
  ServiceRequestStatus,
} from 'prisma/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('register')
  async addAdmin(
    @Body() body: AdminDto,
    @Query('secretCode') secretCode: string,
  ) {
    return this.adminService.addAdmin(body, secretCode);
  }

  @Delete('remove')
  @UseGuards(JwtAuthGuard)
  async removeAdmin(@Query('id') id: string) {
    return this.adminService.removAdmin(id);
  }

  @Get('institution/details')
  @UseGuards(JwtAuthGuard)
  async fetchInstitution(@Query('institutionId') institutionId: string) {
    return this.adminService.fetchInstitution(institutionId);
  }

  @Get('subscribers')
  @UseGuards(JwtAuthGuard)
  async getAllSubscribers(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllSubscribers(limit, cursor);
  }

  @Get('revenue')
  @UseGuards(JwtAuthGuard)
  async getTotalRevenue() {
    return this.adminService.getTotalRevenue();
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  async getAllDevices(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllDevices(limit, cursor);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  async getAllRequests(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllRequests(limit, cursor);
  }

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  async getAllPlans(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllPlans(limit, cursor);
  }

  @Get('institutions')
  @UseGuards(JwtAuthGuard)
  async getAllInstitutions(
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllInstitutions(limit, cursor);
  }

  @Patch('request/status')
  @UseGuards(JwtAuthGuard)
  async updateRequestStatus(
    @Req() req: AuthenticatedRequest,
    @Query('requestId') requestId: string,
    @Query('status') status: ServiceRequestStatus,
  ) {
    return this.adminService.updateRequestStatus(
      req.user.id,
      status,
      requestId,
    );
  }

  @Post('add/plan')
  @UseGuards(JwtAuthGuard)
  async addPlan(@Body() body: PlanDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.addPlan(body, req.user.id);
  }

  @Patch('update/plan')
  @UseGuards(JwtAuthGuard)
  async updatePlan(
    @Query('planId') planId: string,
    @Body() body: Partial<PlanDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updatePlan(planId, body, req.user.id);
  }

  @Delete('plan')
  @UseGuards(JwtAuthGuard)
  async removePlan(
    @Query('planId') planId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.removePlan(planId, req.user.id);
  }

  @Post('subscription/expire-bulk')
  @UseGuards(JwtAuthGuard)
  async bulkExpireSubscription(
    @Query('institutionId') institutionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.bulkExpireSubscription(institutionId, req.user.id);
  }

  @Post('subscription/suspend-bulk')
  @UseGuards(JwtAuthGuard)
  async bulkSuspendSubscription(
    @Query('institutionId') institutionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.bulkSuspendSubscription(
      institutionId,
      req.user.id,
    );
  }

  @Post('add/institution')
  @UseGuards(JwtAuthGuard)
  async addInstitution(
    @Body()
    body: {
      name: string;
      shortName: string;
      location: string;
      status: InstitutionStatus;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.addInstitution(body, req.user.id);
  }

  @Patch('institution')
  @UseGuards(JwtAuthGuard)
  async updateInstitution(
    @Query('institutionId') institutionId: string,
    @Body()
    body: {
      name?: string;
      shortName?: string;
      location?: string;
      status?: InstitutionStatus;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateInstitution(
      institutionId,
      body,
      req.user.id,
    );
  }

  @Delete('institution')
  @UseGuards(JwtAuthGuard)
  async removeInstitution(
    @Query('institutionId') institutionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.removeInstitution(institutionId, req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getAdminProfile(@Req() req: AuthenticatedRequest) {
    return this.adminService.getAdminDetails(req.user.id);
  }
}
