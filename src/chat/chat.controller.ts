import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthenticatedRequest } from 'src/auth/auth.interface';
// import { userSocketMap } from 'src/gateway/socketMapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { chatMap } from 'src/utils/Maps/chatMap';

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

    return {
      success: true,
      message: 'chat initiated',
      chatInstance,
    };
  }

  @Get('')
  @UseGuards(AuthGuard)
  async findChatById(
    @Query() query: { chatId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const chatInstance = await this.dbClient.chat.findFirst({
      where: {
        id: query.chatId,
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
      message: 'chat initiated',
      chatInstance,
    };
  }
}
