import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-create-group',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './create-group.component.html',
    styleUrls: ['./create-group.component.css']
})
export class CreateGroupComponent {
    @Output() groupCreated = new EventEmitter<any>();
    @Output() cancelCreate = new EventEmitter<void>();

    groupName = '';
    searchQuery = '';
    searchResults: any[] = [];
    selectedUsers: any[] = [];
    currentUser: any;

    constructor(private http: HttpClient, private authService: AuthService) {
        this.currentUser = this.authService.getCurrentUser();
    }

    searchUsers() {
        if (!this.searchQuery.trim()) {
            this.searchResults = [];
            return;
        }

        this.http.get(`http://localhost:3000/auth/users?search=${this.searchQuery}`)
            .subscribe((data: any) => {
                // Filter out already selected users
                this.searchResults = data.filter((u: any) =>
                    !this.selectedUsers.find(s => s._id === u._id) && u._id !== this.currentUser._id
                ).slice(0, 4);
            });
    }

    addUser(user: any) {
        this.selectedUsers.push(user);
        this.searchResults = [];
        this.searchQuery = '';
    }

    removeUser(user: any) {
        this.selectedUsers = this.selectedUsers.filter(u => u._id !== user._id);
    }

    createGroup() {
        if (!this.groupName || this.selectedUsers.length < 2) return;

        const payload = {
            name: this.groupName,
            users: JSON.stringify(this.selectedUsers.map(u => u._id)),
            adminId: this.currentUser._id
        };

        this.http.post('http://localhost:3000/chat/group', payload)
            .subscribe({
                next: (data: any) => {
                    this.groupCreated.emit(data);
                },
                error: (err) => console.error("Failed to create group", err)
            });
    }

    cancel() {
        this.cancelCreate.emit();
    }
}
