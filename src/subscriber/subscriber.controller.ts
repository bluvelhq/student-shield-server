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
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    serviceId: string;
    role: string;
  };
}

@Controller('subscriber')
@ApiTags('subscriber')
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get subscriber profile' })
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.subscriberService.getSubscriberDetails(req.user.id);
  }

  @Patch('profile/update')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiOperation({ summary: 'Update subscriber profile' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        phone: { type: 'string', example: '1234567890' },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'other'],
          example: 'male',
        },
        residence: { type: 'string', example: 'Accra' },
        level: { type: 'string', example: '100' },
        profilePicture: { type: 'string', format: 'binary' },
      },
      required: [
        'firstName',
        'lastName',
        'phone',
        'gender',
        'residence',
        'level',
      ],
    },
  })
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
