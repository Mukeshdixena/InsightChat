export interface User {
    _id: string;
    username: string;
    email?: string;
    pic?: string;
}

export interface Chat {
    _id: string;
    chatName: string;
    isGroupChat: boolean;
    users: User[];
    latestMessage?: Message;
    groupAdmin?: User;
    unreadCount?: number;
}

export interface Reaction {
    emoji: string;
    users: string[]; // User IDs
}

export interface Message {
    _id: string;
    sender: User;
    content: string;
    chat: Chat | string; // Populated or ID
    readBy?: string[];
    status?: 'sent' | 'delivered' | 'read';
    deliveredTo?: string[];
    reactions?: Reaction[];
    replyTo?: Message | string;
    isEdited?: boolean;
    editedAt?: Date;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
