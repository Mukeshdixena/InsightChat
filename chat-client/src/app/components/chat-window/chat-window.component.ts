import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-chat-window',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.css']
})
export class ChatWindowComponent implements OnChanges, OnInit, AfterViewChecked {
    @Input() chat: any;
    messages: any[] = [];
    newMessage: string = "";
    currentUser: any;

    typing: boolean = false;
    isTyping: boolean = false;
    typingUserName: string = '';

    replyingTo: any = null;

    editingMessage: any = null;

    showReactionPicker: { [key: string]: boolean } = {};
    availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    showMessageMenu: { [key: string]: boolean } = {};

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    constructor(
        private http: HttpClient,
        private socketService: SocketService,
        private authService: AuthService
    ) {
        this.currentUser = this.authService.getCurrentUser();
    }

    ngOnInit() {
        this.socketService.setup(this.currentUser);
        this.socketService.messageReceived().subscribe((message: any) => {
            if (this.chat && message.chat._id === this.chat._id) {
                this.messages.push(message);
                this.scrollToBottom();

                this.socketService.emitMessageDelivered(message._id, this.currentUser._id);

                setTimeout(() => {
                    this.markMessagesAsRead([message._id]);
                }, 500);
            }
        });

        this.socketService.typing().subscribe(() => {
            this.isTyping = true;
            if (this.chat && !this.chat.isGroupChat) {
                const otherUser = this.chat.users.find((u: any) => u._id !== this.currentUser._id);
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
            this.isTyping = false;
            this.typingUserName = '';

            setTimeout(() => this.markAllMessagesAsRead(), 500);
        }
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    rewriteDebounceTimer: any;

    typingHandler() {
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
            if (timeDiff >= timerLength && this.typing) {
                this.socketService.stopTyping(this.chat._id);
                this.typing = false;
            }
        }, timerLength);

        if (this.rewriteDebounceTimer) {
            clearTimeout(this.rewriteDebounceTimer);
        }

        this.rewriteDebounceTimer = setTimeout(() => {
            if (this.newMessage.trim().length > 3) {
                this.requestRewrite();
            }
        }, 2000);
    }

    fetchMessages() {
        this.http.get(`http://localhost:3000/messages/${this.chat._id}`).subscribe({
            next: (data: any) => {
                this.messages = data;
                this.scrollToBottom();

                setTimeout(() => this.markAllMessagesAsRead(), 500);
            },
            error: (err) => console.error("Failed to fetch messages", err)
        });
    }

    markAllMessagesAsRead() {
        if (!this.messages || this.messages.length === 0) return;

        const unreadMessageIds = this.messages
            .filter(msg => !this.isMyMessage(msg) && (!msg.readBy || !msg.readBy.includes(this.currentUser._id)))
            .map(msg => msg._id);

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
        if (!this.newMessage.trim()) return;

        if (this.editingMessage) {
            this.saveEdit();
            return;
        }

        this.socketService.stopTyping(this.chat._id);
        this.typing = false;

        const messageData: any = {
            content: this.newMessage,
            chatId: this.chat._id,
            userId: this.currentUser._id
        };

        if (this.replyingTo) {
            messageData.replyTo = this.replyingTo._id;
        }

        this.http.post('http://localhost:3000/messages', messageData).subscribe({
            next: (data: any) => {
                if (Array.isArray(data)) {
                    this.messages = data;
                } else {
                    this.socketService.sendMessage(data);
                    this.messages.push(data);
                }
                this.newMessage = "";
                this.replyingTo = null;
                this.scrollToBottom();
            },
            error: (err) => console.error("Failed to send message", err)
        });
    }

    rewriteSuggestions: any = null;
    showRewritePopup: boolean = false;
    isRewriting: boolean = false;
    customRewritePrompt: string = '';

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
        if (!this.chat) return "";
        if (this.chat.isGroupChat) {
            return this.chat.chatName;
        }
        const otherUser = this.chat.users.find((u: any) => u._id !== this.currentUser._id);
        return otherUser ? otherUser.username : "Unknown User";
    }

    isMyMessage(msg: any): boolean {
        return msg.sender._id === this.currentUser._id || msg.sender === this.currentUser._id;
    }

    getMessageStatus(msg: any): string {
        if (!this.isMyMessage(msg)) return '';

        return msg.status || 'sent';
    }

    scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) { }
    }

    toggleMessageMenu(messageId: string) {
        const currentState = this.showMessageMenu[messageId];
        this.showMessageMenu = {};
        this.showMessageMenu[messageId] = !currentState;
    }

    showChatInfo: boolean = false;

    toggleChatDetails() {
        this.showChatInfo = !this.showChatInfo;
    }

    copyMessage(message: any) {
        if (!message || !message.content) return;
        navigator.clipboard.writeText(message.content).then(() => {
            console.log('Message copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    toggleReactionPicker(messageId: string) {
        this.showReactionPicker[messageId] = !this.showReactionPicker[messageId];
    }

    addReaction(message: any, emoji: string) {
        this.http.post(`http://localhost:3000/messages/${message._id}/reaction`, {
            emoji,
            userId: this.currentUser._id
        }).subscribe({
            next: (updatedMessage: any) => {
                const msg = this.messages.find(m => m._id === message._id);
                if (msg) {
                    msg.reactions = updatedMessage.reactions;
                }
                this.socketService.emitReaction(message._id, emoji, this.currentUser._id, this.chat._id);
                this.showReactionPicker[message._id] = false;
            },
            error: (err) => console.error("Failed to add reaction", err)
        });
    }

    hasUserReacted(message: any, emoji: string): boolean {
        if (!message.reactions) return false;
        const reaction = message.reactions.find((r: any) => r.emoji === emoji);
        return reaction ? reaction.users.includes(this.currentUser._id) : false;
    }

    getReactionCount(message: any, emoji: string): number {
        if (!message.reactions) return 0;
        const reaction = message.reactions.find((r: any) => r.emoji === emoji);
        return reaction ? reaction.users.length : 0;
    }

    replyToMessage(message: any) {
        this.replyingTo = message;
        this.editingMessage = null;
    }

    cancelReply() {
        this.replyingTo = null;
    }

    startEdit(message: any) {
        if (!this.isMyMessage(message) || message.isDeleted) return;

        this.editingMessage = message;
        this.newMessage = message.content;
        this.replyingTo = null;
    }

    saveEdit() {
        if (!this.editingMessage || !this.newMessage.trim()) return;

        this.http.put(`http://localhost:3000/messages/${this.editingMessage._id}`, {
            content: this.newMessage,
            userId: this.currentUser._id
        }).subscribe({
            next: (updatedMessage: any) => {
                const msg = this.messages.find(m => m._id === this.editingMessage._id);
                if (msg) {
                    msg.content = updatedMessage.content;
                    msg.isEdited = true;
                    msg.editedAt = updatedMessage.editedAt;
                }
                this.socketService.emitMessageEdit(this.editingMessage._id, this.newMessage, this.chat._id);
                this.cancelEdit();
            },
            error: (err) => console.error("Failed to edit message", err)
        });
    }

    cancelEdit() {
        this.editingMessage = null;
        this.newMessage = '';
    }

    deleteMessage(message: any) {
        if (!this.isMyMessage(message) || message.isDeleted) return;

        if (!confirm('Are you sure you want to delete this message?')) return;

        this.http.delete(`http://localhost:3000/messages/${message._id}`, {
            body: { userId: this.currentUser._id }
        }).subscribe({
            next: () => {
                const msg = this.messages.find(m => m._id === message._id);
                if (msg) {
                    msg.isDeleted = true;
                    msg.content = '';
                }
                this.socketService.emitMessageDelete(message._id, this.chat._id);
            },
            error: (err) => console.error("Failed to delete message", err)
        });
    }
}
