import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SubscriberDto } from 'src/dto/subscriber.dto';
import { Role } from 'prisma/generated/prisma/enums';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe a user to a plan' })
  @ApiQuery({ name: 'planId', required: true, type: String })
  @ApiQuery({ name: 'institutionId', required: true, type: String })
  async subscribe(
    @Body() payload: SubscriberDto,
    @Query('planId') planId: string,
    @Query('institutionId') institutionId: string,
  ) {
    return this.authService.subscribe(payload, planId, institutionId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login a subscriber or admin using their Service ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', example: 'SRV-ABC123XYZ' },
        privilege: {
          type: 'string',
          enum: Object.values(Role),
          example: Role.SUBSCRIBER,
        },
      },
      required: ['serviceId', 'privilege'],
    },
  })
  async login(
    @Body('serviceId') serviceId: string,
    @Body('privilege') privilege: Role,
  ) {
    return this.authService.login(serviceId, privilege);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout the current session' })
  async logout(@Query('id') id: string, @Query('role') role: Role) {
    return this.authService.logout(id, role);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset a user password (Service ID) and email it to them',
  })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiQuery({ name: 'role', required: true, enum: Role })
  async resetPassword(
    @Query('email') email: string,
    @Query('role') role: Role,
  ) {
    return this.authService.resetPassword(email, role);
  }

  @Delete('remove-account')
  @ApiOperation({
    summary:
      'Remove a user account (soft delete for subscribers, hard delete for admins)',
  })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiQuery({ name: 'role', required: true, enum: Role })
  async removeAccount(@Query('id') id: string, @Query('role') role: Role) {
    return this.authService.removeAccount(id, role);
  }

  @Patch('deactivate-account')
  @ApiOperation({ summary: 'Deactivate a subscriber account' })
  @ApiQuery({ name: 'id', required: true, type: String })
  @ApiQuery({ name: 'role', required: true, enum: Role })
  async deactivateAccount(@Query('id') id: string, @Query('role') role: Role) {
    return this.authService.deactivateAccount(id, role);
  }

  @Post('request-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiQuery({ name: 'role', required: true, enum: Role })
  async requestPasswordResetToken(
    @Query('email') email: string,
    @Query('role') role: Role,
  ) {
    return this.authService.requestPasswordResetToken(email, role);
  }
}
