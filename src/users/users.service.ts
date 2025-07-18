import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from 'src/auth/DTO/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private dbClient: PrismaService) {}

  async findUserById(userId: string) {
    return this.dbClient.user.findUnique({
      where: { id: userId },
      select: { password: false, email: true, id: true, username: true },
    });
  }

  async findUserByEmail(userEmail: string) {
    return this.dbClient.user.findUnique({
      where: { email: userEmail },
      select: { password: true, email: true, id: true, username: true },
    });
  }

  async ListUsers() {
    return this.dbClient.user.findMany({
      select: { password: false, email: true, id: true, username: true },
    });
  }
  async findUserByName(name: string) {
    console.log(name);
    return this.dbClient.user.findMany({
      where: { username: { contains: name } },
      select: { password: false, email: true, id: true, username: true },
    });
  }

  async createUser(dto: RegisterDto) {
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(dto.password, salt);

    return this.dbClient.user.create({
      data: {
        username: dto.userName,
        email: dto.email,
        password: hashedPass,
      },
      select: { password: false, email: true, id: true, username: true },
    });
  }
}
