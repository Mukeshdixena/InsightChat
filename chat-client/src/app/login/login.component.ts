import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  username = '';
  password = '';
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  submit() {
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.toast.showSuccess('Logged in successfully');
        this.router.navigate(['/']);
      },
      error: err => {
        const msg = err?.error?.message || 'Login failed';
        this.toast.showError(msg);
      }
    });
  }

  gotoSignup() {
    this.router.navigate(['/signup']);
  }
}
