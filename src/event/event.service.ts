import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { userSocketMap } from 'src/gateway/socketMapper';
import { PrismaService } from 'src/prisma/prisma.service';
import { chatMap, IChatInstance } from 'src/utils/Maps/chatMap';
import { userChatIdsMap } from 'src/utils/Maps/userChatIdsMap';
import { enqueue } from 'src/utils/taskQueuer';

@Injectable()
export class EventService {
  constructor(private dbClient: PrismaService) {}

  @OnEvent('message.create')
  handleMessageSend(
    msgId: string,
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

    void this.saveMessage(msgId, message, userId, chatId);

    chatInstance.messages.push({
      id: msgId,
      chatId,
      content: message,
      createdAt: new Date(),
      deletedAt: null,
      editedAt: null,
      senderId: userId,
    });
    chatMap.set(chatId, chatInstance);

    void this.messageUnseenByAll(chatInstance, msgId);

    if (receiverSocket) {
      receiverSocket.emit('online-friends', {
        onlineConvoIds: [chatId],
      });
      userSocketMap.get(userId)?.emit('online-friends', {
        onlineConvoIds: [chatId],
      });
    }
    // Notify the recipient via socket
    receiverSocket?.emit('message-receive', {
      id: msgId,
      chatId: chatId,
      content: message,
      senderId: userId,
      timestamp: new Date(),
    });
  }

  async saveMessage(
    msgId: string,
    message: string,
    userId: string,
    chatId: string,
  ) {
    const newMessage = await this.dbClient.message.create({
      data: {
        id: msgId,
        content: message,
        senderId: userId,
        chatId: chatId,
      },
    });
    return newMessage;
  }

  messageUnseenByAll(chatInstance: IChatInstance, messageId: string) {
    const seenEntries = chatInstance?.participants.map((p) => ({
      chatId: p.chatId,
      messageId,
      userId: p.userId,
    }));

    enqueue('messageSeenT1', async () => {
      await this.dbClient.messageSeen.createMany({
        data: seenEntries,
      });
    });
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
    //inMemory list
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

  @OnEvent('message.seen')
  notifyMessageSeen(chatId: string, userId: string) {
    //notify all the connected user that a user has seen all the messages of a chatInstance
    const chatInstance = chatMap.get(chatId);
    chatInstance?.participants.forEach((p) => {
      if (userSocketMap.has(p.userId) && p.userId !== userId) {
        userSocketMap.get(p.userId)?.emit('message-seen', { chatId, userId });
      }
    });
  }
}
