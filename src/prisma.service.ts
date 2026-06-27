import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const url = process.env.DATABASE_URL || '';
    const adapter = new PrismaPg({ connectionString: url });
    super({ adapter });
  }
}
