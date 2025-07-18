import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [JwtModule.register({ global: true }), UsersModule],
  providers: [AuthService, JwtService, AuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
