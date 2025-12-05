import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../services/socket.service';
import { AuthService } from '../services/auth.service';
import { api } from '../config/api';
import { AppConfig } from '../config/app.config';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  message = '';
  messages: any[] = [];
  username = '';

  @ViewChild('scrollMe') scrollContainer!: ElementRef;

  constructor(
    private socket: SocketService,
    private auth: AuthService
  ) { }

  async ngOnInit() {
    this.username = this.auth.getUsername() || 'Guest';

    try {
      const res = await api.get('/messages');
      this.messages = res.data;
      setTimeout(() => this.scrollToBottom(), 50);
    } catch {
      console.error("Failed to load messages");
    }

    this.socket.messageReceived().subscribe((msg: any) => {
      this.messages.push(msg);
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  send() {
    const text = this.message.trim();
    if (!text) return;

    const payload = {
      from: this.username,
      text,
      ts: Date.now()
    };

    this.socket.sendMessage(payload);
    this.message = '';
  }

  scrollToBottom() {
    try {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    } catch { }
  }


  menuOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  openProfile() {
    window.location.href = '/profile';
  }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }

}
