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
import { enqueue } from 'src/utils/taskQueuer';
import { v4 as uuidV4 } from 'uuid';

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
    const msgId = uuidV4();

    this.event.emit(
      'message.create',
      msgId,
      dto.message,
      req.user.uid,
      dto.chatId,
      dto.toUserId,
    );

    return {
      success: true,
      message: 'Message sent successfully',
      msgId,
    };
  }

  @Post('initiate-dm')
  @UseGuards(AuthGuard)
  async initiateDMChat(
    @Body() dto: { toUserId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const existingChat = await this.dbClient.chat.findFirst({
      where: {
        type: 'DM',
        participants: {
          some: {
            userId: { in: [dto.toUserId, req.user.uid] },
          },
        },
      },
    });
    if (existingChat) {
      return {
        success: true,
        message: 'chat exist',
        chatInstance: existingChat,
      };
    }
    const chatInstance = await this.dbClient.chat.create({
      data: {
        type: 'DM',
        participants: {
          create: [{ userId: dto.toUserId }, { userId: req.user.uid }],
        },
      },
      include: {
        participants: {
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

  @Post('message-seen')
  @UseGuards(AuthGuard)
  messageSeen(
    @Body() dto: { chatId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    // The user has seen all the messages of the chatInstance
    enqueue('messageSeenT1', async () => {
      await this.dbClient.messageSeen.updateMany({
        where: { chatId: dto.chatId, userId: req.user.uid },
        data: { isSeen: true },
      });
    });

    this.event.emit('message.seen', dto.chatId, req.user.uid);
    return {
      success: true,
      message: 'all the message has seen in the inbox',
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
          include: {
            user: { select: { username: true, email: true, id: true } },
          },
        },
        messages: true,
      },
    });

    const messageSeen = await this.dbClient.messageSeen.findMany({
      where: { chatId: chatId },
    });

    return {
      success: true,
      message: 'chat found',
      chatInstance,
      messageSeen,
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
          include: {
            user: { select: { username: true, email: true, id: true } },
          },
        },
        messages: { take: 30, orderBy: { createdAt: 'asc' } }, // Fetch last 10 messages
      },
    });
    const messageSeen = await this.dbClient.messageSeen.findMany({
      where: { chatId: { in: userChatIdsMap.get(req.user.uid) } },
    });

    return {
      success: true,
      message: 'chat list retrieved',
      conversations,
      messageSeen,
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
    await this.dbClient.messageSeen.deleteMany();

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
