import { IoAdapter } from '@nestjs/platform-socket.io';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';
import { AuthenticatedSocket } from 'src/utils/interfaces';
import { Server } from 'socket.io';
import { CustomConfigService } from 'src/config/config.service';

export class AuthIoAdapter extends IoAdapter {
  constructor(
    private jwtService: JwtService,
    private readonly config: CustomConfigService,
  ) {
    super();
  }

  createIOServer(port: number, options?: object): any {
    const server = super.createIOServer(port, options) as Server;

    server.use((socket: AuthenticatedSocket, next) => {
      try {
        // Get token from header or auth payload
        console.log(socket.handshake);
        const rawToken = this.getTokenFromCookie(
          socket.handshake.headers.cookie,
        );

        if (!rawToken) throw new UnauthorizedException('Token not found');

        const payload: { uid: string; email: string } = this.jwtService.verify(
          rawToken,
          { secret: this.config.getJWTSecret() },
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
