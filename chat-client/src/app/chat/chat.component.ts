import { Component, OnInit } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit {

  message = "";
  chatMessages: string[] = [];

  constructor(private socketService: SocketService) {}

  ngOnInit(): void {
    this.socketService.receiveMessages().subscribe(msg => {
      this.chatMessages.push(msg.message);
    });
  }

  send() {
    if (this.message.trim()) {
      this.socketService.sendMessage(this.message);
      this.message = "";
    }
  }
}
