import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { DB_URL } from 'src/config/env';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: DB_URL,
        },
      },
    });
  }
}
