import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

export interface ChatMessage {
  from: string;
  text: string;
  ts: number;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {

  private socket!: Socket;
  private destroy$ = new Subject<void>();

  isConnected = false;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    // Hard-coded local backend
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to WebSocket server:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.warn('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });
  }

  // -------------------------
  // SEND MESSAGE
  // -------------------------
  sendMessage(message: ChatMessage) {
    if (!this.isConnected) {
      console.warn('Trying to send message while disconnected');
    }
    this.socket.emit('sendMessage', message);
  }

  // -------------------------
  // RECEIVE MESSAGES
  // -------------------------
  receiveMessages(): Observable<ChatMessage> {
    return new Observable(observer => {
      const handler = (data: ChatMessage) => observer.next(data);

      this.socket.on('receiveMessage', handler);

      return () => this.socket.off('receiveMessage', handler);
    });
  }

  // -------------------------
  // CLEANUP
  // -------------------------
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
