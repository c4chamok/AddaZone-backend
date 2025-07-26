import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('api/test')
export class TestController {
  constructor(private dbClient: PrismaService) {}
  @Get()
  async testEndpoint(@Query() query: { chatId: string }) {
    const chat = await this.dbClient.chat.findUnique({
      where: { id: query.chatId },
      include: {
        participants: true,
      },
    });
    console.log(JSON.stringify(chat).length);
    return { message: 'Test endpoint is working!', chat };
  }

  @Get('cookie-test')
  cookieTest(@Req() req: Request) {
    console.log(req.cookies);
    return {
      message: 'Cookie test endpoint is working!',
      cookie: 'test-cookie-value',
    };
  }
}
