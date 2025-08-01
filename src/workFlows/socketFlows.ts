//When a user connects to the socket ->
// 1. Add the user id to the userSocketMap.
// 2. Emit an nest(server) event to handle the socket connection.
// 3. Fetch all chats of the user.
// 4. add the chat ids to the userChatIdsMap.
// 5. add the chat to the chatMap.
// 6. for each chat, check if there are any online participants. except the user itself.
// 7. If there are online participants, emit an event to the socket of the participant with the chat id.
