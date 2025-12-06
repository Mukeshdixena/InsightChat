
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

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
    private http: HttpClient,
    private authService: AuthService,
    private socketService: SocketService
  ) { }

  ngOnInit() {
    this.findAiBot();

    this.socketService.messageReceived().subscribe((message: any) => {
      if (this.chatId && message.chat && message.chat._id === this.chatId) {
        this.messages.push(message);
        this.socketService.stopTyping(this.chatId);
        this.isTyping = false;
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
    this.http.get(`http://localhost:3000/auth/users?search=AI Bot`).subscribe({
      next: (users: any) => {
        if (Array.isArray(users)) {
          const bot = users.find((u: any) => u.username === 'AI Bot');
          if (bot) {
            this.aiBotId = bot._id;
          }
        }
      },
      error: (err: any) => console.error("Could not find AI Bot", err)
    });
  }

  startChatWithAi() {
    if (!this.aiBotId) return;
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    this.loading = true;

    // Create/Access Chat
    this.http.post('http://localhost:3000/chat', {
      userId: currentUser._id,
      otherUserId: this.aiBotId
    }).subscribe({
      next: (chat: any) => {
        this.chatId = chat._id;
        this.loading = false;
        // Fetch history
        this.fetchMessages();
      },
      error: (err: any) => {
        console.error("Error starting chat with AI", err);
        this.loading = false;
      }
    });
  }

  fetchMessages() {
    if (!this.chatId) return;
    this.http.get(`http://localhost:3000/messages/${this.chatId}`).subscribe({
      next: (msgs: any) => this.messages = msgs,
      error: (err: any) => console.error(err)
    });
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

    const token = this.authService.getToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    this.http.post('http://localhost:3000/messages', messagePayload, { headers }).subscribe({
      next: (msg: any) => {
        this.messages.push(msg);
        this.socketService.sendMessage(msg);
      },
      error: (err: any) => console.error("Failed to send message", err)
    });
  }

  isMyMessage(msg: any): boolean {
    const start = this.authService.getCurrentUser()?._id;
    const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
    return senderId === start;
  }
}

