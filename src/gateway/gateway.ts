// chat.gateway.ts
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from 'src/utils/interfaces';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSocketMap = new Map<string, AuthenticatedSocket>();

  handleConnection(socket: AuthenticatedSocket) {
    this.userSocketMap.set(socket.user.uid, socket);
    console.log(
      `Socket authenticated: ${socket.user.uid} with socketId ${socket.id}`,
    );
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const { uid } = socket.user;
    if (uid) {
      this.userSocketMap.delete(uid);
    }
    console.log('Socket disconnected:', socket.id);
  }
}
