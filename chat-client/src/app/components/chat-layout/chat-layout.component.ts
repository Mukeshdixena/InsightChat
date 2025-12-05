import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatListComponent } from '../chat-list/chat-list.component';
import { ChatWindowComponent } from '../chat-window/chat-window.component';

@Component({
    selector: 'app-chat-layout',
    standalone: true,
    imports: [CommonModule, ChatListComponent, ChatWindowComponent],
    templateUrl: './chat-layout.component.html',
    styleUrls: ['./chat-layout.component.css']
})
export class ChatLayoutComponent {
    selectedChat: any = null;

    onChatSelected(chat: any) {
        this.selectedChat = chat;
    }
}
