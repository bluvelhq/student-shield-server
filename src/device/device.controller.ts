import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DeviceDto } from 'src/dto/devices.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('add')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('media'))
  async addDevice(
    @Req() req: AuthenticatedRequest,
    @Body() body: DeviceDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.deviceService.addDevice(req.user.id, body, files);
  }

  @Get('details')
  async getDeviceDetails(@Query('deviceId') deviceId: string) {
    return this.deviceService.getDeviceDetails(deviceId);
  }

  @Patch('edit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('media'))
  async editDevice(
    @Req() req: AuthenticatedRequest,
    @Query('deviceId') deviceId: string,
    @Body() body: Partial<DeviceDto>,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.deviceService.editDevice(req.user.id, deviceId, body, files);
  }

  @Delete('remove')
  @UseGuards(JwtAuthGuard)
  async removeDevice(
    @Req() req: AuthenticatedRequest,
    @Query('deviceId') deviceId: string,
  ) {
    return this.deviceService.removeDevice(req.user.id, deviceId);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getSubscriberDevices(@Req() req: AuthenticatedRequest) {
    return this.deviceService.getSubscriberDevices(req.user.id);
  }
}
