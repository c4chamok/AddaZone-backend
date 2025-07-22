import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    uid: string;
    email: string;
  };
}
