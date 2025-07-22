import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { SocketGateway } from './gateway';

@Module({
  imports: [JwtModule.register({ global: true })],
  providers: [JwtService, SocketGateway],
})
export class GatewayModule {}
