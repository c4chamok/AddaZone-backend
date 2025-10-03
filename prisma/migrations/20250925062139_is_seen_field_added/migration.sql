/*
  Warnings:

  - Added the required column `chatId` to the `MessageSeen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MessageSeen" ADD COLUMN     "chatId" TEXT NOT NULL,
ADD COLUMN     "isSeen" BOOLEAN NOT NULL DEFAULT false;
