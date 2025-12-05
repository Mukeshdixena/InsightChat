import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {

  username = '';
  password = '';
  loading = false;
  error = '';
  success = '';

  constructor(private auth: AuthService, private router: Router) {}

  async signup() {
    this.loading = true;
    this.error = '';
    this.success = '';

    try {
      await this.auth.signup(this.username, this.password);
      this.success = 'Account created. Please login.';
      setTimeout(() => this.router.navigate(['/login']), 1200);
    } catch {
      this.error = 'Signup failed';
    }

    this.loading = false;
  }

  goLogin() {
    this.router.navigate(['/login']);
  }
}
