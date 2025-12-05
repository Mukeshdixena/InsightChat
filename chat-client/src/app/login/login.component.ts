import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    this.loading = true;
    this.error = '';

    try {
      await this.auth.login(this.username, this.password);
      this.router.navigate(['/chat']);
    } catch {
      this.error = 'Invalid credentials';
    }

    this.loading = false;
  }

  goSignup() {
    this.router.navigate(['/signup']);
  }
}
