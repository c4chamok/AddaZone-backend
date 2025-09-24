import { $Enums } from 'generated/prisma';

export interface IChatParticipants {
  id: string;
  chatId: string;
  userId: string;
  role: $Enums.ParticipantRole | null;
  joinedAt: Date;
}

interface IMessages {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export interface IChatInstance {
  id: string;
  name: string | null;
  type: string;
  createdAt: Date;
  participants: IChatParticipants[];
  messages: IMessages[];
}
// 
export const chatMap = new Map<string, IChatInstance>();
