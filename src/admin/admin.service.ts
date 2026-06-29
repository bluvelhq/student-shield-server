import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
