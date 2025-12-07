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

    // Reply functionality
    replyingTo: any = null;

    // Edit functionality
    editingMessage: any = null;

    // Reaction picker
    showReactionPicker: { [key: string]: boolean } = {};
    availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    // Message menu
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

                // Mark message as delivered immediately
                this.socketService.emitMessageDelivered(message._id, this.currentUser._id);

                // Mark as read after a short delay (simulating user viewing the message)
                // This happens when chat is already open and active
                setTimeout(() => {
                    this.markMessagesAsRead([message._id]);
                }, 500);
            }
        });

        this.socketService.typing().subscribe(() => {
            this.isTyping = true;
            // Get typing user name from chat users
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
            // Check if suggestions match current input (simple validation)
            // Or just always show them
            this.rewriteSuggestions = data.suggestions;
            this.showRewritePopup = true;
            this.isRewriting = false;
        });

        // Listen for message status updates
        this.socketService.onMessageStatusUpdate().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                message.status = data.status;
                if (data.readBy) message.readBy = data.readBy;
                if (data.deliveredTo) message.deliveredTo = data.deliveredTo;
            }
        });

        // Listen for reaction updates
        this.socketService.onReactionUpdate().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                this.fetchMessages(); // Refresh to get updated reactions
            }
        });

        // Listen for message edits
        this.socketService.onMessageUpdate().subscribe((data: any) => {
            const message = this.messages.find(m => m._id === data.messageId);
            if (message) {
                message.content = data.content;
                message.isEdited = data.isEdited;
            }
        });

        // Listen for message deletions
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

            // Mark all unread messages as delivered and read when opening chat
            setTimeout(() => this.markAllMessagesAsRead(), 500);
        }
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    rewriteDebounceTimer: any;

    typingHandler() {
        // Hide popup immediately when typing resumes
        if (this.showRewritePopup) {
            this.showRewritePopup = false;
        }

        if (!this.typing) {
            this.typing = true;
            this.socketService.sendTyping(this.chat._id);
        }

        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;

        // Clear existing typing stop timer
        // (Note: The original code recreated the timer locally every time which was buggy/redundant logic 
        // effectively only checking time diff in a closure. 
        // I will keep the existing typing indicator logic structure but add my own separate debounce for rewrite
        // to minimize regression risk on the 'typing...' indicator itself, or I could merge them.)

        // Existing typing indicator logic (kept as is mostly, just re-wrapped/verified)
        setTimeout(() => {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength && this.typing) {
                this.socketService.stopTyping(this.chat._id);
                this.typing = false;
            }
        }, timerLength);

        // Auto-Trigger Rewrite Logic
        if (this.rewriteDebounceTimer) {
            clearTimeout(this.rewriteDebounceTimer);
        }

        this.rewriteDebounceTimer = setTimeout(() => {
            if (this.newMessage.trim().length > 3) {
                this.requestRewrite();
            }
        }, 2000); // 2 seconds pause trigger
    }

    fetchMessages() {
        this.http.get(`http://localhost:3000/messages/${this.chat._id}`).subscribe({
            next: (data: any) => {
                this.messages = data;
                this.scrollToBottom();

                // Mark messages as delivered and read after fetching
                setTimeout(() => this.markAllMessagesAsRead(), 500);
            },
            error: (err) => console.error("Failed to fetch messages", err)
        });
    }

    markAllMessagesAsRead() {
        if (!this.messages || this.messages.length === 0) return;

        // Get all message IDs that are not sent by current user and not already read
        const unreadMessageIds = this.messages
            .filter(msg => !this.isMyMessage(msg) && (!msg.readBy || !msg.readBy.includes(this.currentUser._id)))
            .map(msg => msg._id);

        if (unreadMessageIds.length > 0) {
            this.markMessagesAsRead(unreadMessageIds);
        }
    }

    markMessagesAsRead(messageIds: string[]) {
        if (!messageIds || messageIds.length === 0) return;

        // Emit read status for all messages
        this.socketService.emitMessagesRead(messageIds, this.currentUser._id);

        // Update local status immediately for better UX
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

        // If editing, save edit instead
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

        // Add replyTo if replying
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
                this.replyingTo = null; // Clear reply after sending
                this.scrollToBottom();
            },
            error: (err) => console.error("Failed to send message", err)
        });
    }

    rewriteSuggestions: any = null;
    showRewritePopup: boolean = false;
    isRewriting: boolean = false;

    requestRewrite() {
        if (!this.newMessage.trim() || this.newMessage.trim().length <= 3) return;
        this.isRewriting = true;
        this.socketService.requestRewrite(this.newMessage);
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

        // Return status: 'sent', 'delivered', or 'read'
        return msg.status || 'sent';
    }

    scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) { }
    }

    // -------------------------
    // REACTION METHODS
    // -------------------------
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

    // -------------------------
    // REPLY METHODS
    // -------------------------
    replyToMessage(message: any) {
        this.replyingTo = message;
        this.editingMessage = null; // Cancel edit if replying
    }

    cancelReply() {
        this.replyingTo = null;
    }

    // -------------------------
    // EDIT METHODS
    // -------------------------
    startEdit(message: any) {
        if (!this.isMyMessage(message) || message.isDeleted) return;

        this.editingMessage = message;
        this.newMessage = message.content;
        this.replyingTo = null; // Cancel reply if editing
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

    // -------------------------
    // DELETE METHODS
    // -------------------------
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
