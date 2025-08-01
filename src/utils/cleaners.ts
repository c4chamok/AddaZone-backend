import { userSocketMap } from 'src/gateway/socketMapper';
import { chatMap } from './Maps/chatMap';
import { userChatIdsMap } from './Maps/userChatIdsMap';

export const userChatMemCleaner = async (userId: string) => {
  userSocketMap.delete(userId);
  const userChatIds = userChatIdsMap.get(userId);

  const isExist = await new Promise((resolve) => {
    setTimeout(() => {
      if (userSocketMap.has(userId)) {
        console.log(`User ${userId} still has an active socket connection.`);
        return resolve(true);
      }
      return resolve(false);
    }, 2000);
  });
  if (isExist) return;

  console.log(`Cleaning up memory for user ${userId}`);
  userChatIds?.forEach((chatId) => {
    const chatInstance = chatMap.get(chatId);
    // If the chat instance exists and has no participants, we can safely delete it from the chatMap
    // This ensures that we don't delete chats that still have active participants
    // This is a simple cleanup to avoid memory leaks and to ensure that we don't keep empty chat instances in memory.
    if (chatInstance) {
      chatInstance.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          userSocketMap.get(participant.userId)?.emit('offline-friends', {
            onlineConvoIds: [participant.chatId],
          });
        }
        if (!userSocketMap.has(participant.userId)) {
          chatMap.delete(chatId);
        }
      });
    }
  });
};
