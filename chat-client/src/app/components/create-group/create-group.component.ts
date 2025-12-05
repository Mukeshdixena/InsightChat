import { Component, EventEmitter, OnInit, Output } from '@angular/core';
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
export class CreateGroupComponent implements OnInit {
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

    allUsers: any[] = [];

    // ... constructor ...

    ngOnInit() {
        this.fetchAllUsers();
    }

    fetchAllUsers() {
        this.http.get('http://localhost:3000/auth/users').subscribe({
            next: (data: any) => {
                console.log("Fetched users:", data);
                this.allUsers = data;
                this.filterUsers();
            },
            error: (err) => {
                console.error("Failed to fetch users", err);
                alert("Could not load users. Check connection.");
            }
        });
    }

    searchUsers() {
        this.filterUsers();
    }

    filterUsers() {
        let filtered = this.allUsers;

        // Filter by search query
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(u => u.username.toLowerCase().includes(query));
        }

        // Filter out already selected users and self
        this.searchResults = filtered.filter(u =>
            !this.selectedUsers.find(s => s._id === u._id) && (this.currentUser ? u._id !== this.currentUser._id : true)
        );
    }

    addUser(user: any) {
        this.selectedUsers.push(user);
        this.filterUsers();
        // Keep search query to allow adding multiple from same search or clear it? 
        // User pattern usually: search -> click -> search cleared.
        this.searchQuery = '';
        this.filterUsers(); // Refilter with empty query to show all again
    }

    removeUser(user: any) {
        this.selectedUsers = this.selectedUsers.filter(u => u._id !== user._id);
        this.filterUsers();
    }

    createGroup() {
        if (!this.currentUser) {
            alert("You must be logged in to create a group.");
            return;
        }
        if (!this.groupName || this.selectedUsers.length < 1) return; // Allow 1 user now

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
                error: (err) => {
                    console.error("Failed to create group", err);
                    alert("Failed to create group: " + (err.error || err.message));
                }
            });
    }

    cancel() {
        this.cancelCreate.emit();
    }
}
