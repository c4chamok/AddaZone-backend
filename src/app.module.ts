import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/allException.filter';
import { UsersModule } from './users/users.module';
import { GatewayModule } from './gateway/gateway.module';
import { ChatModule } from './chat/chat.module';
import { TestModule } from './test/test.module';
import { EventModule } from './event/event.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthIoAdapter } from './gateway/gateway.adapter';
import { CustomConfigModule } from './config/config.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    UsersModule,
    GatewayModule,
    ChatModule,
    TestModule,
    EventModule,
    EventEmitterModule.forRoot(),
    CustomConfigModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    AuthIoAdapter,
  ],
  exports: [],
})
export class AppModule {}
