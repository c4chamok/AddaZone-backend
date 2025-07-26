// chat.gateway.ts
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from 'src/utils/interfaces';
import { userSocketMap } from './socketMapper';
import { EventEmitter2 } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private event: EventEmitter2) {}
  @WebSocketServer() server: Server;

  handleConnection(socket: AuthenticatedSocket) {
    this.event.emit('socket.connected', socket.user.uid);
    userSocketMap.set(socket.user.uid, socket);
    console.log(
      `Socket authenticated: ${socket.user.uid} with socketId ${socket.id}`,
    );
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const { uid } = socket.user;
    if (uid) {
      userSocketMap.delete(uid);
    }
    console.log('Socket disconnected:', socket.id);
  }
}
