import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Request as ExpressReq } from 'express';

interface RequestWithUser extends ExpressReq {
  user: {
    uid: string;
    email: string;
  };
}

@Controller('api/users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req: RequestWithUser) {
    // console.log(req.user);
    return {
      success: true,
      user: await this.userService.findUserById(req.user.uid),
    };
  }

  @Get('find')
  @UseGuards(AuthGuard)
  async findUserByName(@Query() query: { userName: string }) {
    return {
      success: true,
      users: await this.userService.findUserByName(query.userName),
    };
  }
}
