import { Module } from '@nestjs/common';
import { SocketGateway } from './gateway';

@Module({
  imports: [],
  providers: [SocketGateway],
})
export class GatewayModule {}
