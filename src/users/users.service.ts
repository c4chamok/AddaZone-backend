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

  async findUsersWithExistingChat(currentUserId: string, searchTerm: string) {
    const results = await this.dbClient.$queryRaw`
            SELECT 
              u.id, 
              u.username, 
              c.id as "existingChatId"
            FROM "User" u
            LEFT JOIN (
              SELECT cp."userId", c.id 
              FROM "Chat" c
              JOIN "ChatParticipant" cp ON c.id = cp."chatId"
              WHERE c.type = 'DM'
              AND c.id IN (
                SELECT "chatId" 
                FROM "ChatParticipant" 
                WHERE "userId" = ${currentUserId}
              )
            ) c ON u.id = c."userId"
            WHERE u.username ILIKE ${`%${searchTerm}%`}
            AND u.id != ${currentUserId}
            LIMIT 10`;

    return results;
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
