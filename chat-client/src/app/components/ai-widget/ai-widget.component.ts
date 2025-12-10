import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../../services/toast.service';
import { api } from '../../config/api';

@Component({
  selector: 'app-ai-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-widget.component.html',
  styleUrls: ['./ai-widget.component.css']
})
export class AiWidgetComponent implements OnInit, AfterViewChecked {
  isOpen = false;
  messages: any[] = [];
  newMessage = '';
  aiBotId: string | null = null;
  chatId: string | null = null;
  loading = false;
  isTyping = false;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(
    private authService: AuthService,
    private socketService: SocketService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.findAiBot();

    this.socketService.messageReceived().subscribe((message: any) => {
      if (this.chatId && message.chat && message.chat._id === this.chatId) {
        this.messages.push(message);
        this.socketService.stopTyping(this.chatId);
        this.isTyping = false;

        // Mark AI message as delivered and read
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.socketService.emitMessageDelivered(message._id, currentUser._id);
          this.socketService.emitMessageRead(message._id, currentUser._id);
        }
      }
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
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  toggleWidget() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && !this.chatId && this.aiBotId) {
      this.startChatWithAi();
    }
  }

  findAiBot() {
    api.get('/auth/users?search=AI Bot').then((res) => {
      const users = res.data;
      if (Array.isArray(users)) {
        const bot = users.find((u: any) => u.username === 'AI Bot');
        if (bot) {
          this.aiBotId = bot._id;
        }
      }
    }).catch(err => console.error("Could not find AI Bot", err));
  }

  startChatWithAi() {
    if (!this.aiBotId) return;
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    this.loading = true;

    // Create/Access Chat
    api.post('/chat', {
      userId: currentUser._id,
      otherUserId: this.aiBotId
    }).then((res) => {
      const chat = res.data;
      this.chatId = chat._id;
      this.loading = false;
      // Fetch history
      this.fetchMessages();
    }).catch(err => {
      console.error("Error starting chat with AI", err);
      this.loading = false;
    });
  }

  fetchMessages() {
    if (!this.chatId) return;
    api.get(`/messages/${this.chatId}`).then((res) => {
      this.messages = res.data;
    }).catch(err => console.error(err));
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.chatId) return;

    const content = this.newMessage;
    this.newMessage = '';
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const messagePayload = {
      content: content,
      chatId: this.chatId,
      userId: currentUser._id
    };

    api.post('/messages', messagePayload).then((res) => {
      const response = res.data;
      if (Array.isArray(response)) {
        // If response is an array, it's the full chat history (User + Bot)
        this.messages = response;
      } else {
        // Fallback for standard message
        this.messages.push(response);
        // AI Chat is private, socket emission might be redundant if we just fetched full history,
        // but good for consistency or other devices.
        this.socketService.sendMessage(response);
      }
    }).catch(err => console.error("Failed to send message", err));
  }

  isMyMessage(msg: any): boolean {
    const start = this.authService.getCurrentUser()?._id;
    const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
    return senderId === start;
  }

  getMessageStatus(msg: any): string {
    if (!this.isMyMessage(msg)) return '';
    return msg.status || 'sent';
  }

  showMenu = false;

  toggleMenu(event?: Event) {
    if (event) event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  clearChat() {
    this.showMenu = false;
    if (!this.chatId) return;

    api.delete(`/messages/${this.chatId}`).then(() => {
      this.messages = [];
      this.toastService.show('AI chat history cleared', 'success');
    }).catch(err => {
      console.error("Failed to clear chat", err);
      this.toastService.show('Failed to clear chat history', 'error');
    });
  }
}

