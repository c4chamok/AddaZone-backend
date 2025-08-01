export const userChatIdsMap = new Map<string, string[]>();
// This map holds user IDs as keys and an array of chat IDs as values.
// It is used to track which chats a user is part of, allowing for quick access to
// a user's chats without needing to query the database each time.
