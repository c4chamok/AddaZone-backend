import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { CustomConfigService } from 'src/config/config.service';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private readonly config: CustomConfigService) {
    super({
      datasources: {
        db: {
          url: config.getDBUrl(),
        },
      },
    });
  }
}
