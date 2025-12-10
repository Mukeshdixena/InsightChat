import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { MessageService } from '../../services/message.service';
import { Message, Chat, User } from '../../shared/models';
import { getChatName, isMyMessage, getMessageStatus, hasUserReacted, getReactionCount, filterUnreadMessageIds, getSenderName, getMessageContent } from '../../shared/utils/chat.utils';
import { scrollToBottom, copyToClipboard } from '../../shared/utils/dom.utils';
import { TruncatePipe } from '../pipes/truncate.pipe';

@Component({
    selector: 'app-chat-window',
    standalone: true,
    imports: [CommonModule, FormsModule, TruncatePipe],
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements OnChanges, OnInit, AfterViewChecked, OnDestroy {
    @Input() chat: Chat | undefined;
    messages: Message[] = [];
    newMessage: string = "";
    currentUser: any; // AuthService likely returns generic object, keeping any for now or need to update AuthService

    typing: boolean = false;
    isTyping: boolean = false;
    typingUserName: string = '';


    editingMessage: Message | null = null;

    showReactionPicker: { [key: string]: boolean } = {};
    availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    showMessageMenu: { [key: string]: boolean } = {};

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    rewriteSuggestions: any = null;
    showRewritePopup: boolean = false;
    isRewriting: boolean = false;
    customRewritePrompt: string = '';

    showChatInfo: boolean = false;

    constructor(
        private messageService: MessageService,
        private socketService: SocketService,
        private authService: AuthService
    ) {
        this.currentUser = this.authService.getCurrentUser();
    }

    ngOnInit() {
        this.socketService.setup(this.currentUser);
        this.socketService.messageReceived().subscribe((message: Message) => {
            if (this.chat && (message.chat as any)._id === this.chat._id) {
                this.messages.push(message);
                setTimeout(() => scrollToBottom(this.scrollContainer), 0);

                this.socketService.emitMessageDelivered(message._id, this.currentUser._id);

                setTimeout(() => {
                    this.markMessagesAsRead([message._id]);
                }, 500);
            }
        });

        this.socketService.typing().subscribe(() => {
            this.isTyping = true;
            if (this.chat && !this.chat.isGroupChat) {
                const otherUser = this.chat.users.find((u: User) => u._id !== this.currentUser._id);
                this.typingUserName = otherUser ? otherUser.username : '';
            }
        });

        this.socketService.stopTypingListener().subscribe(() => {
            this.isTyping = false;
            this.typingUserName = '';
        });

        this.socketService.onRewriteSuggestions().subscribe((data: any) => {
            this.rewriteSuggestions = data.suggestions;
            this.showRewritePopup = true;
            this.isRewriting = false;
        });

        this.socketService.onMessageStatusUpdate().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                message.status = data.status;
                if (data.readBy) message.readBy = data.readBy;
                if (data.deliveredTo) message.deliveredTo = data.deliveredTo;
            }
        });

        this.socketService.onReactionUpdate().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                this.fetchMessages();
            }
        });

        this.socketService.onMessageUpdate().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                message.content = data.content;
                message.isEdited = data.isEdited;
            }
        });

        this.socketService.onMessageRemove().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                message.isDeleted = true;
                message.content = '';
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['chat'] && this.chat) {
            this.fetchMessages();
            this.socketService.joinChat(this.chat._id);
            this.socketService.setActiveChat(this.chat._id); // Set active chat
            this.isTyping = false;
            this.typingUserName = '';

            setTimeout(() => this.markAllMessagesAsRead(), 500);
        }
    }

    ngOnDestroy() {
        this.socketService.clearActiveChat();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        // Check if click is inside the menu or the trigger
        const isMenuClick = target.closest('.message-actions-menu');
        const isTriggerClick = target.closest('.message-menu-trigger');

        if (!isMenuClick && !isTriggerClick) {
            this.showMessageMenu = {}; // Close all menus
        }

        const isReactionPickerClick = target.closest('.reaction-picker');
        if (!isReactionPickerClick) {
            this.showReactionPicker = {};
        }
    }

    ngAfterViewChecked() {
        scrollToBottom(this.scrollContainer);
    }

    resizeDebounceTimer: any; // Unused but kept if needed

    typingHandler() {
        if (!this.chat) return;

        if (this.showRewritePopup) {
            this.showRewritePopup = false;
        }

        if (!this.typing) {
            this.typing = true;
            this.socketService.sendTyping(this.chat._id);
        }

        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;

        setTimeout(() => {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength && this.typing && this.chat) {
                this.socketService.stopTyping(this.chat._id);
                this.typing = false;
            }
        }, timerLength);
    }

    fetchMessages() {
        if (!this.chat) return;
        this.messageService.getMessages(this.chat._id).subscribe({
            next: (data: Message[]) => {
                this.messages = data;
                this.messages = data;
                setTimeout(() => scrollToBottom(this.scrollContainer), 0);

                setTimeout(() => this.markAllMessagesAsRead(), 500);
            },
            error: (err) => console.error("Failed to fetch messages", err)
        });
    }

    markAllMessagesAsRead() {
        if (!this.messages || this.messages.length === 0) return;

        const unreadMessageIds = filterUnreadMessageIds(this.messages, this.currentUser._id);

        if (unreadMessageIds.length > 0) {
            this.markMessagesAsRead(unreadMessageIds);
        }
    }

    markMessagesAsRead(messageIds: string[]) {
        if (!messageIds || messageIds.length === 0) return;

        this.socketService.emitMessagesRead(messageIds, this.currentUser._id);

        messageIds.forEach(id => {
            const msg = this.messages.find(m => m._id === id);
            if (msg) {
                if (!msg.readBy) msg.readBy = [];
                if (!msg.readBy.includes(this.currentUser._id)) {
                    msg.readBy.push(this.currentUser._id);
                }
            }
        });
    }

    sendMessage() {
        if (!this.newMessage.trim() || !this.chat) return;

        if (this.editingMessage) {
            this.saveEdit();
            return;
        }

        this.socketService.stopTyping(this.chat._id);
        this.typing = false;

        this.messageService.sendMessage(this.newMessage, this.chat._id, this.currentUser._id, undefined).subscribe({
            next: (data: Message | Message[]) => {
                // Handle case where backend might return array (though service expects single)
                // Assuming service implementation returns single message as per creating
                if (Array.isArray(data)) {
                    this.messages = data; // Should not happen with current backend service logic but kept for safety
                } else {
                    this.socketService.sendMessage(data);
                    this.messages.push(data);
                }
                this.newMessage = "";
                setTimeout(() => scrollToBottom(this.scrollContainer), 0);
            },
            error: (err) => console.error("Failed to send message", err)
        });
    }

    requestRewrite() {
        if (!this.newMessage.trim() || this.newMessage.trim().length <= 3) return;
        this.isRewriting = true;
        this.socketService.requestRewrite(this.newMessage, this.customRewritePrompt);
    }

    applyRewrite(text: string) {
        this.newMessage = text;
        this.rewriteSuggestions = null;
        this.showRewritePopup = false;
    }

    cancelRewrite() {
        this.rewriteSuggestions = null;
        this.showRewritePopup = false;
    }

    getChatName(): string {
        return getChatName(this.chat!, this.currentUser._id);
    }

    isMyMessage(msg: Message): boolean {
        return isMyMessage(msg, this.currentUser._id);
    }

    getMessageStatus(msg: Message): string {
        return getMessageStatus(msg, this.currentUser._id);
    }



    getSenderName(msg: Message | undefined | null): string {
        return getSenderName(msg);
    }

    getMessageContent(msg: Message | undefined | null): string {
        return getMessageContent(msg);
    }



    toggleMessageMenu(messageId: string) {
        const currentState = this.showMessageMenu[messageId];
        this.showMessageMenu = {};
        this.showMessageMenu[messageId] = !currentState;
    }

    toggleChatDetails() {
        this.showChatInfo = !this.showChatInfo;
    }

    copyMessage(message: Message) {
        if (!message || !message.content) return;
        copyToClipboard(message.content);
    }

    toggleReactionPicker(messageId: string) {
        this.showReactionPicker[messageId] = !this.showReactionPicker[messageId];
    }

    addReaction(message: Message, emoji: string) {
        if (!this.chat) return;
        this.messageService.addReaction(message._id, emoji, this.currentUser._id).subscribe({
            next: (updatedMessage: any) => {
                // updatedMessage from backend might be generic, ensuring types
                const msg = this.messages.find(m => m._id === message._id);
                if (msg) {
                    msg.reactions = updatedMessage.reactions;
                }
                if (this.chat) {
                    this.socketService.emitReaction(message._id, emoji, this.currentUser._id, this.chat._id);
                }
                this.showReactionPicker[message._id] = false;
            },
            error: (err) => console.error("Failed to add reaction", err)
        });
    }

    hasUserReacted(message: Message, emoji: string): boolean {
        return hasUserReacted(message, emoji, this.currentUser._id);
    }

    getReactionCount(message: Message, emoji: string): number {
        return getReactionCount(message, emoji);
    }



    startEdit(message: Message) {
        if (!this.isMyMessage(message) || message.isDeleted) return;

        this.editingMessage = message;
        this.editingMessage = message;
        this.newMessage = message.content;
    }

    saveEdit() {
        if (!this.editingMessage || !this.newMessage.trim() || !this.chat) return;

        this.messageService.editMessage(this.editingMessage._id, this.newMessage, this.currentUser._id).subscribe({
            next: (updatedMessage: Message) => {
                const msg = this.messages.find(m => m._id === (this.editingMessage as Message)._id);
                if (msg) {
                    msg.content = updatedMessage.content;
                    msg.isEdited = true;
                    msg.editedAt = updatedMessage.editedAt;
                }
                if (this.chat) {
                    this.socketService.emitMessageEdit(this.editingMessage!._id, this.newMessage, this.chat._id);
                }
                this.cancelEdit();
            },
            error: (err) => console.error("Failed to edit message", err)
        });
    }

    cancelEdit() {
        this.editingMessage = null;
        this.newMessage = '';
    }

    deleteMessage(message: Message) {
        if (!this.isMyMessage(message) || message.isDeleted || !this.chat) return;

        if (!confirm('Are you sure you want to delete this message?')) return;

        this.messageService.deleteMessage(message._id, this.currentUser._id).subscribe({
            next: () => {
                const msg = this.messages.find(m => m._id === message._id);
                if (msg) {
                    msg.isDeleted = true;
                    msg.content = '';
                }
                if (this.chat) {
                    this.socketService.emitMessageDelete(message._id, this.chat._id);
                }
            },
            error: (err) => console.error("Failed to delete message", err)
        });
    }
}
