import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { userSocketMap } from 'src/gateway/socketMapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { chatMap, IChatInstance } from 'src/utils/Maps/chatMap';

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

  @Get('ping')
  async ping() {
    const isConnected = await this.dbClient.$queryRaw`SELECT 1`; // Check if the database connection is alive
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    return { success: true, message: 'pong' };
  }

  @Get('cookie-test')
  cookieTest(@Req() req: Request) {
    console.log(req.cookies);
    return {
      message: 'Cookie test endpoint is working!',
      cookie: 'test-cookie-value',
    };
  }
  @Get('list-chats')
  listChats() {
    return this.dbClient.chat.findMany({
      include: {
        participants: true,
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
  @Get('list-maps')
  listMaps() {
    const usersockets: { socketid: string; userId: string }[] = [];
    const chats: IChatInstance[] = [];
    chatMap.forEach((value) => {
      return chats.push(value);
    });
    userSocketMap.forEach((value, key) => {
      return usersockets.push({ socketid: value.id, userId: key });
    });
    return { usersockets, chats };
  }
}
