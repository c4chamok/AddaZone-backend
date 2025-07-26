/*
  Warnings:

  - You are about to drop the `_ChannelDataToChat` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[chatId]` on the table `ChannelData` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chatId` to the `ChannelData` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ChannelDataToChat" DROP CONSTRAINT "_ChannelDataToChat_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChannelDataToChat" DROP CONSTRAINT "_ChannelDataToChat_B_fkey";

-- AlterTable
ALTER TABLE "ChannelData" ADD COLUMN     "chatId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_ChannelDataToChat";

-- CreateIndex
CREATE UNIQUE INDEX "ChannelData_chatId_key" ON "ChannelData"("chatId");

-- AddForeignKey
ALTER TABLE "ChannelData" ADD CONSTRAINT "ChannelData_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
