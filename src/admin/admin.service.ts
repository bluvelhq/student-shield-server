import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminDto } from 'src/dto/admin.dto';
import { HelperService } from 'src/helpers/helpers.service';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from 'prisma/generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
    private readonly config: ConfigService,
  ) {}

  async addAdmin(payload: AdminDto, secretCode: string) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (admin) throw new ConflictException('Admin already exists');

    const adminSecretCode = this.config.get<string>('admin.secretCode');

    if (adminSecretCode !== secretCode)
      throw new UnauthorizedException('Invalid secret code');

    const serviceId = this.helper.generateServiceId();

    const hashedServiceId = bcrypt.hash(serviceId, 10);

    await this.prisma.admin.create({
      data: {
        email: payload.email,
        serviceId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        privilege: Role.ADMIN,
      },
    });
    return { message: 'Admin created successfully' };
  }

  async removAdmin(email: string) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        email,
      },
    });

    if (!admin) throw new NotFoundException('Admin not found');

    await this.prisma.admin.delete({
      where: {
        email,
      },
    });
    return { message: 'Admin removed successfully' };
  }

  async fetchInstitution(institutionId: string) {
    try {
      const institution = await this.prisma.institution.findUnique({
        where: {
          id: institutionId,
        },
      });
      return {
        institution,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
