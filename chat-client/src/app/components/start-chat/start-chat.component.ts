import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { api } from '../../config/api';

@Component({
    selector: 'app-start-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './start-chat.component.html',
    styleUrls: ['./start-chat.component.css']
})
export class StartChatComponent implements OnInit {
    @Output() chatStarted = new EventEmitter<any>();
    @Output() cancelStart = new EventEmitter<void>();

    searchQuery = '';
    allUsers: any[] = [];
    filteredUsers: any[] = [];
    currentUser: any;

    constructor(private authService: AuthService) {
        this.currentUser = this.authService.getCurrentUser();
    }

    ngOnInit() {
        this.fetchAllUsers();
    }

    fetchAllUsers() {
        api.get('/auth/users').then((res) => {
            this.allUsers = res.data;
            this.filterUsers();
        }).catch((err) => console.error("Failed to fetch users", err));
    }

    searchUsers() {
        this.filterUsers();
    }

    filterUsers() {
        let filtered = this.allUsers;

        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(u => u.username.toLowerCase().includes(query));
        }

        // Exclude self and AI Bot
        this.filteredUsers = filtered.filter(u =>
            (this.currentUser ? u._id !== this.currentUser._id : true) &&
            u.username !== 'AI Bot'
        );
    }

    startChat(user: any) {
        this.chatStarted.emit(user);
    }

    cancel() {
        this.cancelStart.emit();
    }
}
