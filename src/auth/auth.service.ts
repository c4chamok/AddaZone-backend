import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto, RegisterDto } from './DTO/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JWT_SECRET } from 'src/config/env';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private dbClient: PrismaService,
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signUp(dto: RegisterDto) {
    const newUser = await this.userService.createUser(dto);

    return {
      success: true,
      message: 'you have signed up',
      email: dto.email,
      userId: newUser.id,
    };
  }

  async signIn(dto: AuthDto) {
    const theUser = await this.userService.findUserByEmail(dto.email);

    if (!theUser) {
      throw new UnauthorizedException('Invalid credential');
    }

    const isPassMatched = await bcrypt.compare(dto.password, theUser.password);

    if (!isPassMatched) throw new UnauthorizedException('Invalid credential');

    const accessToken = await this.jwtService.signAsync(
      { uid: theUser.id, email: theUser.email },
      { secret: JWT_SECRET, expiresIn: '1h' },
    );

    return {
      success: true,
      message: 'you have signed in',
      access_token: accessToken,
    };
  }
}
