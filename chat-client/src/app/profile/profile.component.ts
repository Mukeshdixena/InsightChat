import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {

  username = '';
  newUsername = '';
  newPassword = '';
  message = '';

  constructor(private auth: AuthService, private router: Router) {
    this.username = this.auth.getUsername();
    this.newUsername = this.username;
  }

  async updateProfile() {
    this.message = '';
    const username = this.newUsername.trim();
    const password = this.newPassword.trim();

    await this.auth.updateProfile(username, password);
    this.message = "Profile updated successfully";

    this.username = this.auth.getUsername();
    this.newPassword = '';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
