import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/prisma.service';
import { HelperService } from 'src/helpers/helpers.service';
import { PlanService } from 'src/plan/plan.service';
import { AdminService } from 'src/admin/admin.service';
import { CacheModule } from '@nestjs/cache-manager';
import { PaymentService } from 'src/payment/payment.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: Number(configService.get<string>('jwt.expirationTime')),
        },
      }),
    }),
    PassportModule,
    CacheModule.register({
      isGlobal: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    HelperService,
    PlanService,
    AdminService,
    JwtService,
    PaymentService,
    ConfigService,
    SupabaseService,
    ConfigService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
