import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../services/socket.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  message = '';
  messages: { from: string; text: string; ts: number }[] = [];
  username = '';

  constructor(
    private socket: SocketService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Get logged-in username
    this.username = this.auth.getUsername() || 'Unknown';

    // Load real-time messages
    this.socket.receiveMessages().subscribe((data) => {
      this.messages.push(data);
    });
  }

  send() {
    const trimmed = this.message.trim();
    if (!trimmed) return;

    const payload = {
      from: this.username,
      text: trimmed,
      ts: Date.now()
    };

    this.socket.sendMessage(payload);
    this.message = '';
  }
}
