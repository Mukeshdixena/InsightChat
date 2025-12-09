import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { SocketService } from './services/socket.service';
import { ToastService } from './services/toast.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  private messageSub: Subscription | undefined;

  constructor(
    private socketService: SocketService,
    private toastService: ToastService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // Request Browser Notification Permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    this.messageSub = this.socketService.messageReceived().subscribe((message: any) => {
      // 1. Check if it's my own message
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && message.sender && (message.sender._id === currentUser._id || message.sender === currentUser._id)) {
        return;
      }

      // 2. Check if we are currently looking at this chat -- DISABLED per user request
      /*
      const activeChatId = this.socketService.activeChatId.value;
      if (message.chat && activeChatId === message.chat._id) {
        return;
      }
      */

      // 3. Show notification
      const senderName = message.sender ? (message.sender.username || "User") : "User";
      const content = message.content ? (message.content.length > 50 ? message.content.substring(0, 50) + "..." : message.content) : "Sent a message";

      // Toast
      this.toastService.show(`New message from ${senderName}: ${content}`, 'info');

      // Browser Notification
      if (Notification.permission === 'granted') {
        const notif = new Notification(`New message from ${senderName}`, {
          body: content,
          icon: 'assets/icon.png' // Optional: Add a valid path if available, or remove
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    });
  }

  ngOnDestroy() {
    if (this.messageSub) {
      this.messageSub.unsubscribe();
    }
  }
}
