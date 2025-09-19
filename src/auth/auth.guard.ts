import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CustomConfigService } from 'src/config/config.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly config: CustomConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.tokenFromCookies(request);

    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: string;
        email: string;
      }>(token, { secret: this.config.getJWTSecret() });
      request['user'] = payload;
      return true;
    } catch {
      throw new Error('Unauthorized: Invalid or expired token');
    }
  }

  private tokenFromCookies(req: Request): string {
    // console.log(req.cookies);
    const token = (req.cookies as { access_token: string }).access_token;
    if (!token) {
      throw new Error('Unauthorized: Token not found in cookies');
    }
    return token;
  }
}
