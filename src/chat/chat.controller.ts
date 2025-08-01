import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthenticatedRequest } from 'src/auth/auth.interface';
import { userSocketMap } from 'src/gateway/socketMapper';
// import { userSocketMap } from 'src/gateway/socketMapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { chatMap } from 'src/utils/Maps/chatMap';
import { userChatIdsMap } from 'src/utils/Maps/userChatIdsMap';

@Controller('api/chat')
export class ChatController {
  constructor(
    private dbClient: PrismaService,
    private event: EventEmitter2,
  ) {}

  @Post('send-message')
  @UseGuards(AuthGuard)
  sendMessage(
    @Body() dto: { message: string; chatId: string; toUserId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    // Validate input
    if (!dto.message?.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    // 1. Verify chat exists and user has access
    const chatInstance = chatMap.get(dto.chatId);
    if (!chatInstance) {
      throw new BadRequestException('Chat not found');
    }
    if (
      !chatInstance.participants.some(
        (participant) => participant.userId === req.user.uid,
      ) &&
      !chatInstance.participants.some(
        (participant) => participant.userId === dto.toUserId,
      )
    ) {
      throw new ForbiddenException('You do not have access to this chat');
    }
    // 3. Notify recipient

    this.event.emit(
      'message.create',
      dto.message,
      req.user.uid,
      dto.chatId,
      dto.toUserId,
    );

    return {
      success: true,
      message: 'Message sent successfully',
    };
  }

  @Post('initiate-dm')
  @UseGuards(AuthGuard)
  async initiateDMChat(
    @Body() dto: { toUserId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const chatInstance = await this.dbClient.chat.create({
      data: {
        type: 'DM',
        participants: {
          create: [{ userId: dto.toUserId }, { userId: req.user.uid }],
        },
      },
      include: {
        participants: {
          where: { userId: { not: req.user.uid } },
          include: {
            user: { select: { username: true, email: true, id: true } },
          },
        },
        messages: true,
      },
    });

    chatMap.set(chatInstance.id, chatInstance);
    const userChatIds = userChatIdsMap.get(req.user.uid);
    userChatIds?.push(chatInstance.id);
    userChatIdsMap.set(req.user.uid, userChatIds || [chatInstance.id]);

    const convo = userSocketMap.has(dto.toUserId)
      ? { ...chatInstance, status: 'online' }
      : { ...chatInstance, status: 'offline' };

    return {
      success: true,
      message: 'chat initiated',
      chatInstance: convo,
    };
  }

  @Get(':chatId')
  @UseGuards(AuthGuard)
  async findChatById(
    @Param('chatId') chatId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const chatInstance = await this.dbClient.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          some: { userId: req.user.uid }, // Verify user has access
        },
      },
      include: {
        participants: {
          where: { userId: { not: req.user.uid } },
          include: {
            user: { select: { username: true, email: true, id: true } },
          },
        },
        messages: true,
      },
    });

    return {
      success: true,
      message: 'chat found',
      chatInstance,
    };
  }

  @Get('')
  @UseGuards(AuthGuard)
  async listChats(@Request() req: AuthenticatedRequest) {
    const conversations = await this.dbClient.chat.findMany({
      where: {
        participants: {
          some: { userId: req.user.uid }, // Verify user has access
        },
        messages: { some: { id: { not: undefined } } }, // Ensure there are messages in the chat
      },
      include: {
        participants: {
          where: { userId: { not: req.user.uid } },
          include: {
            user: { select: { username: true, email: true, id: true } },
          },
        },
        messages: { take: 30, orderBy: { createdAt: 'asc' } }, // Fetch last 10 messages
      },
    });

    return {
      success: true,
      message: 'chat list retrieved',
      conversations,
    };
  }
  @Delete('cascade')
  async cahtAlldelete() {
    await this.dbClient.message.deleteMany({
      where: { chat: { type: 'DM' } },
    });
    await this.dbClient.chatParticipant.deleteMany({
      where: { chat: { type: 'DM' } },
    });
    await this.dbClient.chat.deleteMany({
      where: {
        type: 'DM',
      },
    });
    chatMap.clear();
    userChatIdsMap.clear();
    userSocketMap.clear();
    console.log('All DM chats deleted');

    return {
      success: true,
      message: 'chat list deleted',
      data: await this.dbClient.chat.findMany(),
    };
  }
}
