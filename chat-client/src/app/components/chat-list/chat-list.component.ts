import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CreateGroupComponent } from '../create-group/create-group.component';

@Component({
    selector: 'app-chat-list',
    standalone: true,
    imports: [CommonModule, CreateGroupComponent],
    templateUrl: './chat-list.component.html',
    styleUrls: ['./chat-list.component.css']
})
export class ChatListComponent implements OnInit {
    @Output() chatSelected = new EventEmitter<any>();
    chats: any[] = [];
    currentUser: any;
    showCreateGroup = false;

    constructor(private http: HttpClient, private authService: AuthService) {
        this.currentUser = this.authService.getCurrentUser();
    }

    ngOnInit() {
        this.fetchChats();
    }

    fetchChats() {
        if (!this.currentUser || !this.currentUser._id) {
            console.warn("User not logged in or ID missing, retrying in 1s");
            // Retry mechanics or redirect to login? 
            // For now, just stop.
            return;
        }

        this.http.get(`http://localhost:3000/chat/${this.currentUser._id}`).subscribe({
            next: (data: any) => {
                this.chats = data;
            },
            error: (err) => console.error("Failed to fetch chats", err)
        });
    }

    getChatName(chat: any): string {
        if (chat.isGroupChat) {
            return chat.chatName;
        }
        const otherUser = chat.users.find((u: any) => u._id !== this.currentUser._id);
        return otherUser ? otherUser.username : "Unknown User";
    }

    createGroup() {
        this.showCreateGroup = true;
    }

    onGroupCreated(newGroup: any) {
        this.chats.unshift(newGroup);
        this.chatSelected.emit(newGroup);
        this.showCreateGroup = false;
    }

    cancelCreateGroup() {
        this.showCreateGroup = false;
    }

    selectChat(chat: any) {
        this.chatSelected.emit(chat);
    }

    startChat() {
        const username = prompt("Enter username to chat with:");
        if (!username) return;

        this.http.get(`http://localhost:3000/auth/users?search=${username}`).subscribe({
            next: (users: any) => {
                if (users.length > 0) {
                    const user = users[0];
                    this.createChat(user._id);
                } else {
                    alert("User not found");
                }
            },
            error: (err) => alert("Failed to search user")
        });
    }

    createChat(userId: string) {
        this.http.post('http://localhost:3000/chat', {
            userId: this.currentUser._id,
            otherUserId: userId
        }).subscribe({
            next: (chat: any) => {
                if (!this.chats.find(c => c._id === chat._id)) {
                    this.chats.unshift(chat);
                }
                this.chatSelected.emit(chat);
            },
            error: (err) => console.error("Failed to create chat", err)
        });
    }
}
