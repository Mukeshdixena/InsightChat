import { Message, Chat, User, Reaction } from '../models';

export function getChatName(chat: Chat, currentUserId: string): string {
    if (!chat) return "";
    if (chat.isGroupChat) {
        return chat.chatName;
    }
    const otherUser = chat.users.find((u: User) => u._id !== currentUserId);
    return otherUser ? otherUser.username : "Unknown User";
}

export function isMyMessage(message: Message, currentUserId: string): boolean {
    if (!message || !message.sender) return false;
    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
    return senderId === currentUserId;
}

export function getMessageStatus(message: Message, currentUserId: string): string {
    if (!isMyMessage(message, currentUserId)) return '';
    return message.status || 'sent';
}

export function hasUserReacted(message: Message, emoji: string, currentUserId: string): boolean {
    if (!message.reactions) return false;
    const reaction = message.reactions.find((r: any) => r.emoji === emoji);
    // User IDs in reactions might be strings or objects, assume strings from model definition
    return reaction ? reaction.users.includes(currentUserId) : false;
}

export function getReactionCount(message: Message, emoji: string): number {
    if (!message.reactions) return 0;
    const reaction = message.reactions.find((r: any) => r.emoji === emoji);
    return reaction ? reaction.users.length : 0;
}

export function filterUnreadMessageIds(messages: Message[], currentUserId: string): string[] {
    if (!messages || messages.length === 0) return [];

    return messages
        .filter(msg => !isMyMessage(msg, currentUserId) && (!msg.readBy || !msg.readBy.includes(currentUserId)))
        .map(msg => msg._id);
}

export function getReplyMessage(message: Message): Message | undefined {
    if (!message.replyTo || typeof message.replyTo === 'string') return undefined;
    return message.replyTo as Message;
}

export function getSenderName(message: Message | undefined | null): string {
    if (!message || !message.sender) return 'User';
    if (typeof message.sender === 'string') return 'User';
    return (message.sender as User).username || 'User';
}

export function getMessageContent(message: Message | undefined | null): string {
    if (!message) return '';
    return message.content || '';
}
