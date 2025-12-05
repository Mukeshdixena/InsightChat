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
            }
        });

        this.socketService.typing().subscribe(() => {
            this.isTyping = true;
        });

        this.socketService.stopTypingListener().subscribe(() => {
            this.isTyping = false;
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['chat'] && this.chat) {
            this.fetchMessages();
            this.socketService.joinChat(this.chat._id);
            this.isTyping = false;
        }
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    typingHandler() {
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
    }

    fetchMessages() {
        this.http.get(`http://localhost:3000/messages/${this.chat._id}`).subscribe({
            next: (data: any) => {
                this.messages = data;
                this.scrollToBottom();
            },
            error: (err) => console.error("Failed to fetch messages", err)
        });
    }

    sendMessage() {
        if (!this.newMessage.trim()) return;

        this.socketService.stopTyping(this.chat._id);
        this.typing = false;

        const messageData = {
            content: this.newMessage,
            chatId: this.chat._id,
            userId: this.currentUser._id
        };

        this.http.post('http://localhost:3000/messages', messageData).subscribe({
            next: (data: any) => {
                this.socketService.sendMessage(data);
                this.messages.push(data);
                this.newMessage = "";
                this.scrollToBottom();
            },
            error: (err) => console.error("Failed to send message", err)
        });
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

    scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) { }
    }
}
