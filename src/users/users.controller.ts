import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AuthenticatedRequest } from 'src/auth/auth.interface';

@Controller('api/users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req: AuthenticatedRequest) {
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

  @Get('search')
  @UseGuards(AuthGuard)
  async findUsersWithExistingChat(
    @Query() query: { userName: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      users: await this.userService.findUsersWithExistingChat(
        req.user.uid,
        query.userName,
      ),
    };
  }
}
