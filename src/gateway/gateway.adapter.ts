import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';
import { AuthenticatedSocket } from 'src/utils/interfaces';
import { JWT_SECRET } from 'src/config/env';
import { Server } from 'socket.io';

export class AuthIoAdapter extends IoAdapter {
  constructor(private app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options) as Server;

    const jwtService = this.app.get(JwtService);

    server.use((socket: AuthenticatedSocket, next) => {
      try {
        // Get token from header or auth payload
        const rawToken = this.getTokenFromCookie(
          socket.handshake.headers.cookie,
        );

        if (!rawToken) throw new UnauthorizedException('Token not found');

        const payload: { uid: string; email: string } = jwtService.verify(
          rawToken,
          { secret: JWT_SECRET },
        );

        socket.user = payload; // store user for later use
        next();
      } catch (err) {
        if (err instanceof Error) {
          console.log('[Socket Auth Error]', err.message);
        }
        next(new Error('Unauthorized'));
      }
    });

    return server;
  }

  private getTokenFromCookie(rawCookie?: string): string | null {
    if (!rawCookie) return null;
    const cookies = cookie.parse(rawCookie);
    return cookies['access_token'] || null;
  }
}
