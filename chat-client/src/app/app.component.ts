import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastComponent   // <-- REQUIRED
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'] // if exists, else remove
})
export class AppComponent {}
