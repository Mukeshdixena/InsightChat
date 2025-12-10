import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { CreateGroupComponent } from '../create-group/create-group.component';
import { StartChatComponent } from '../start-chat/start-chat.component';
import { ProfileDrawerComponent } from '../profile-drawer/profile-drawer.component';
import { TruncatePipe } from '../pipes/truncate.pipe';
import { api } from '../../config/api';

@Component({
    selector: 'app-chat-list',
    standalone: true,
    imports: [CommonModule, CreateGroupComponent, StartChatComponent, ProfileDrawerComponent, FormsModule, TruncatePipe],
    templateUrl: './chat-list.component.html',
    styleUrls: ['./chat-list.component.css']
})
export class ChatListComponent implements OnInit {
    @Input() selectedChatId: string | undefined;
    @Output() chatSelected = new EventEmitter<any>();
    chats: any[] = [];
    currentUser: any;
    showCreateGroup = false;
    showStartChat = false;
    showProfileDrawer = false;

    constructor(
        private authService: AuthService,
        private socketService: SocketService
    ) {
        this.currentUser = this.authService.getCurrentUser();
    }

    ngOnInit() {
        this.fetchChats();

        this.socketService.messageReceived().subscribe((message: any) => {
            if (this.selectedChatId !== message.chat._id) {
                const chat = this.chats.find(c => c._id === message.chat._id);
                if (chat) {
                    chat.unreadCount = (chat.unreadCount || 0) + 1;
                    // Move to top
                    this.chats = this.chats.filter(c => c._id !== chat._id);
                    this.chats.unshift(chat);
                } else {
                    // New chat potentially, refresh list or handle add
                    this.fetchChats();
                }
            } else {
                // Even if selected, move to top
                const chat = this.chats.find(c => c._id === message.chat._id);
                if (chat) {
                    this.chats = this.chats.filter(c => c._id !== chat._id);
                    this.chats.unshift(chat);
                }
            }
        });
    }

    fetchChats() {
        if (!this.currentUser || !this.currentUser._id) {
            console.warn("User not logged in or ID missing, retrying in 1s");
            return;
        }

        api.get(`/chat/${this.currentUser._id}`).then((res) => {
            const data = res.data;
            // Filter out AI Bot chats
            this.chats = data.filter((c: any) => {
                if (c.isGroupChat) return true;
                // Check if other user is AI Bot (assuming 'AI Bot' username or similar)
                const otherUser = c.users.find((u: any) => u._id !== this.currentUser._id);
                return otherUser && otherUser.username !== 'AI Bot';
            });
        }).catch(err => console.error("Failed to fetch chats", err));
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
        chat.unreadCount = 0;
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
        api.post('/chat', {
            userId: this.currentUser._id,
            otherUserId: userId
        }).then((res) => {
            const chat = res.data;
            if (!this.chats.find(c => c._id === chat._id)) {
                this.chats.unshift(chat);
            }
            this.chatSelected.emit(chat);
        }).catch(err => console.error("Failed to create chat", err));
    }
}
