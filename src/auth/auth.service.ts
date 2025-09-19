import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthDto, RegisterDto } from './DTO/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { CustomConfigService } from 'src/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private config: CustomConfigService,
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
      { secret: this.config.getJWTSecret(), expiresIn: '1h' },
    );

    return {
      success: true,
      message: 'you have signed in',
      access_token: accessToken,
    };
  }
}
