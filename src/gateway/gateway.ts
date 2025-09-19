// chat.gateway.ts
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from 'src/utils/interfaces';
import { userSocketMap } from './socketMapper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { userChatMemCleaner } from 'src/utils/cleaners';
import { chatMap } from 'src/utils/Maps/chatMap';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private event: EventEmitter2) {}
  @WebSocketServer() server: Server;

  handleConnection(socket: AuthenticatedSocket) {
    console.log('connecting');
    userSocketMap.set(socket.user.uid, socket);
    this.event.emit('socket.connected', socket.user.uid);
    console.log(
      `Socket authenticated: ${socket.user.uid} with socketId ${socket.id}`,
    );
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const { uid } = socket.user;
    if (uid) {
      // userSocketMap.delete(uid);
      userChatMemCleaner(uid);
    }
    console.log('Socket disconnected:', socket.id);
  }

  @SubscribeMessage('typing')
  handleTyping(socket: AuthenticatedSocket, data: { chatId: string }) {
    const chatId = data.chatId;
    const userId = socket.user.uid;
    const chatInstance = chatMap.get(chatId);
    if (!chatInstance) {
      console.error(`Chat instance not found for chatId: ${chatId}`);
      return;
    }
    const participants = chatInstance.participants.filter(
      (participant) => participant.userId !== userId,
    );
    // Notify all participants in the chat that the user is typing
    participants.forEach((participant) => {
      const participantSocket = userSocketMap.get(participant.userId);
      if (participantSocket) {
        participantSocket.emit('user-typing', {
          chatId,
          userId,
        });
      }
    });
    // console.log(`User ${userId} is typing in chat ${chatId}`);
  }
}
