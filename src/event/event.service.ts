import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { userSocketMap } from 'src/gateway/socketMapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { chatMap } from 'src/utils/Maps/chatMap';
import { userChatIdsMap } from 'src/utils/Maps/userChatIdsMap';

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
      userSocketMap.get(toUserId)?.emit('online-friends', {
        onlineConvoIds: [chatId],
      });
      userSocketMap.get(userId)?.emit('online-friends', {
        onlineConvoIds: [chatId],
      });
    }
    // Notify the recipient via socket
    receiverSocket?.emit('message-receive', {
      chatId: chatId,
      content: message,
      senderId: userId,
      timestamp: new Date(),
    });
  }

  async saveMessage(message: string, userId: string, chatId: string) {
    const newMessage = await this.dbClient.message.create({
      data: {
        content: message,
        senderId: userId,
        chatId: chatId,
      },
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
    const onlineConvoIds = new Set<string>();
    const chatIds: string[] = [];
    chats.forEach((chat) => {
      if (chat.participants.length > 0) {
        chatIds.push(chat.id);
        chatMap.set(chat.id, chat);

        if (chat.messages.length === 0) return;
        // Check for online participants
        chat.participants.forEach((participant) => {
          if (
            participant.userId !== userId &&
            userSocketMap.has(participant.userId)
          ) {
            console.log(participant);
            userSocketMap.get(participant.userId)?.emit('online-friends', {
              onlineConvoIds: [participant.chatId],
            });
            onlineConvoIds.add(participant.chatId);
          }
        });
      }
    });
    userSocketMap.get(userId)?.emit('online-friends', {
      onlineConvoIds: Array.from(onlineConvoIds),
    });
    userChatIdsMap.set(userId, chatIds);
  }
}
