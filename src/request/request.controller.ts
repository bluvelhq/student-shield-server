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
import { RequestService } from './request.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestDto } from 'src/dto/request.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('requests')
@ApiTags('Requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Make a request' })
  async makeRequest(
    @Req() req: AuthenticatedRequest,
    @Body() body: RequestDto,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.requestService.makeRequest(req.user.id, body, deviceId);
  }

  @Get('details')
  @ApiOperation({ summary: 'Get request details' })
  async getRequestDetails(@Query('requestId') requestId: string) {
    return this.requestService.getRequestDetails(requestId);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get subscriber requests' })
  async getSubscriberRequests(@Req() req: AuthenticatedRequest) {
    return this.requestService.getSubscriberRequests(req.user.id);
  }

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  async updateRequest(
    @Req() req: AuthenticatedRequest,
    @Query('requestId') requestId: string,
    @Body() body: Partial<RequestDto>,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.requestService.updateRequest(
      req.user.id,
      requestId,
      body,
      deviceId,
    );
  }

  @Delete('delete')
  @UseGuards(JwtAuthGuard)
  async deleteRequest(
    @Req() req: AuthenticatedRequest,
    @Query('requestId') requestId: string,
  ) {
    return this.requestService.deleteRequest(req.user.id, requestId);
  }
}
