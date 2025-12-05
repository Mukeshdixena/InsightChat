import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../services/socket.service';


@Component({
selector: 'app-chat',
standalone: true,
imports: [CommonModule, FormsModule],
templateUrl: './chat.component.html',
styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
message = '';
messages: { from?: string; text: string; ts: number }[] = [];
username = '';


constructor(private socket: SocketService) {}


ngOnInit(): void {
this.username = `User-${Math.floor(Math.random() * 9000) + 1000}`;
this.socket.receiveMessages().subscribe((data) => {
// data should be { from, text, ts }
this.messages.push(data);
// keep scroll behavior handled in template (optional)
});
}


send() {
const trimmed = this.message.trim();
if (!trimmed) return;
const payload = { from: this.username, text: trimmed, ts: Date.now() };
this.socket.sendMessage(payload);
this.message = '';
}
}