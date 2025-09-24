import { userSocketMap } from 'src/gateway/socketMapper';
import { chatMap } from './Maps/chatMap';
import { userChatIdsMap } from './Maps/userChatIdsMap';

const userCleanupTimers = new Map<string, NodeJS.Timeout>();

export const userChatMemCleaner = (userId: string) => {
  // Clear any existing cleanup timer for this user
  if (userCleanupTimers.has(userId)) {
    const timer = userCleanupTimers.get(userId);
    if (timer) clearTimeout(timer);
  }

  // Schedule cleanup in 2s (debounced)
  const timer = setTimeout(() => {
    // If the user reconnected, skip cleanup
    if (userSocketMap.has(userId)) {
      console.log(`User ${userId} is still online, skipping cleanup.`);
      return;
    }

    console.log(`Cleaning up memory for user ${userId}`);
    const userChatIds = userChatIdsMap.get(userId);

    userChatIds?.forEach((chatId) => {
      const chatInstance = chatMap.get(chatId);
      if (!chatInstance) return;

      // Notify online participants
      chatInstance.participants.forEach((participant) => {
        if (
          participant.userId !== userId &&
          userSocketMap.has(participant.userId)
        ) {
          userSocketMap.get(participant.userId)?.emit('offline-friends', {
            onlineConvoIds: [participant.chatId],
          });
        }
      });

      // Delete chat only if *all* participants are offline
      const allOffline = chatInstance.participants.every(
        (p) => !userSocketMap.has(p.userId),
      );
      if (allOffline) {
        chatMap.delete(chatId);
      }
    });

    // Clean up memory
    userCleanupTimers.delete(userId);
  }, 2000);

  userCleanupTimers.set(userId, timer);
};
