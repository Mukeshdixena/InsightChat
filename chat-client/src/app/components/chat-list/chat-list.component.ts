import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CreateGroupComponent } from '../create-group/create-group.component';
import { StartChatComponent } from '../start-chat/start-chat.component';
import { ProfileDrawerComponent } from '../profile-drawer/profile-drawer.component';

@Component({
    selector: 'app-chat-list',
    standalone: true,
    imports: [CommonModule, CreateGroupComponent, StartChatComponent, ProfileDrawerComponent, FormsModule],
    templateUrl: './chat-list.component.html',
    styleUrls: ['./chat-list.component.css']
})
export class ChatListComponent implements OnInit {
    @Output() chatSelected = new EventEmitter<any>();
    chats: any[] = [];
    currentUser: any;
    showCreateGroup = false;
    showStartChat = false;
    showProfileDrawer = false;

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
                // Filter out AI Bot chats
                this.chats = data.filter((c: any) => {
                    if (c.isGroupChat) return true;
                    // Check if other user is AI Bot (assuming 'AI Bot' username or similar)
                    const otherUser = c.users.find((u: any) => u._id !== this.currentUser._id);
                    return otherUser && otherUser.username !== 'AI Bot';
                });
            },
            error: (err) => console.error("Failed to fetch chats", err)
        });
    }

    searchText: string = '';

    get filteredChats() {
        if (!this.searchText) return this.chats;
        return this.chats.filter(chat =>
            this.getChatName(chat).toLowerCase().includes(this.searchText.toLowerCase())
        );
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
        this.showStartChat = true;
    }

    onChatStarted(user: any) {
        this.createChat(user._id);
        this.showStartChat = false;
    }

    cancelStartChat() {
        this.showStartChat = false;
    }

    openProfile() {
        this.showProfileDrawer = true;
    }

    closeProfile() {
        this.showProfileDrawer = false;
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
