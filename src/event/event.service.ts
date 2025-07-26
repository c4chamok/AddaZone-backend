import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { userSocketMap } from 'src/gateway/socketMapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { chatMap } from 'src/utils/Maps/chatMap';

@Injectable()
export class EventService {
  constructor(private dbClient: PrismaService) {}

  @OnEvent('message.create')
  async handleMessageSend(
    message: string,
    userId: string,
    chatId: string,
    toUserId: string,
  ) {
    const receiverSocket = userSocketMap.get(toUserId);

    const chatInstance = chatMap.get(chatId);

    if (!chatInstance) {
      throw new Error('Chat instance not found');
    }
    // If the chat instance has no messages, save the message synchronously
    // to ensure the chat instance is updated before emitting the event
    if (chatInstance?.messages.length > 0) {
      void this.saveMessage(message, userId, chatId);
    } else {
      // console.log(object);
      const newMessage = await this.saveMessage(message, userId, chatId);
      chatInstance.messages.push(newMessage);
      chatMap.set(chatId, chatInstance);
    }
    // Notify the recipient via socket
    receiverSocket?.emit('message-receive', {
      chatId: chatId,
      content: message,
    });
  }

  async saveMessage(message: string, userId: string, chatId: string) {
    const newMessage = await this.dbClient.message.create({
      data: {
        content: message,
        senderId: userId,
        chatId: chatId,
      },
      // include: {
      //   sender: { select: { id: true, username: true } },
      //   chat: {
      //     include: {
      //       participants: {
      //         where: { userId: toUserId },
      //         select: { userId: true },
      //       },
      //     },
      //   },
      // },
    });
    return newMessage;
  }

  @OnEvent('socket.connected')
  async handleSocketConnected(userId: string) {
    const chats = await this.dbClient.chat.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    console.log(JSON.stringify(chats).length);
    chats.forEach((chat) => {
      if (chat.participants.length > 0) {
        chatMap.set(chat.id, chat);
      }
    });
  }
}
