import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-profile-drawer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './profile-drawer.component.html',
    styleUrls: ['./profile-drawer.component.css']
})
export class ProfileDrawerComponent implements OnInit {
    @Output() closeDrawer = new EventEmitter<void>();

    username = '';
    newUsername = '';
    newPassword = '';
    message = '';
    currentUser: any;

    constructor(private auth: AuthService, private router: Router) {
        this.currentUser = this.auth.getCurrentUser();
        this.username = this.currentUser?.username || '';
        this.newUsername = this.username;
    }

    ngOnInit() { }

    async updateProfile() {
        this.message = '';
        const username = this.newUsername.trim();
        const password = this.newPassword.trim(); // Optional

        try {
            await this.auth.updateProfile(username, password);
            this.message = "Profile updated!";
            // Update local state
            this.username = username;
            if (password) this.newPassword = '';
            setTimeout(() => this.message = '', 3000);
        } catch (err) {
            console.error(err);
            this.message = "Failed to update profile";
        }
    }

    logout() {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

    close() {
        this.closeDrawer.emit();
    }
}
