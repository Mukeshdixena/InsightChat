import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  username = '';
  password = '';
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  submit() {
    this.auth.signup(this.username, this.password).subscribe({
      next: () => {
        this.toast.showSuccess('Signup successful');
        this.router.navigate(['/login']);
      },
      error: err => {
        const msg = err?.error?.message || 'Signup failed';
        this.toast.showError(msg);
      }
    });
  }

  gotoLogin() {
    this.router.navigate(['/login']);
  }
}
