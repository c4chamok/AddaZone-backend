/*
  Warnings:

  - A unique constraint covering the columns `[chatId,userId]` on the table `ChatParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Chat_id_idx" ON "Chat"("id");

-- CreateIndex
CREATE INDEX "ChatParticipant_chatId_userId_idx" ON "ChatParticipant"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_chatId_userId_key" ON "ChatParticipant"("chatId", "userId");
