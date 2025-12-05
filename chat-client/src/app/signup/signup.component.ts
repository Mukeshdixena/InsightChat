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

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.username.trim() || !this.password) {
      alert('Please provide username & password');
      return;
    }

    this.auth.signup(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/login']),
      error: err => {
        const msg = err?.error?.message || 'Signup failed';
        alert(msg);
      }
    });
  }
}
