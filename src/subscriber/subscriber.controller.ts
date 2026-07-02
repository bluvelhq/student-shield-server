import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriberService } from './subscriber.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SubscriberDto } from 'src/dto/subscriber.dto';
import { FileInterceptor } from '@nestjs/platform-express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('student')
export class StudentController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.subscriberService.getSubscriberDetails(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture'))
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: Partial<SubscriberDto>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.subscriberService.updateSubscriberDetails(
      req.user.id,
      body,
      file,
    );
  }
}
