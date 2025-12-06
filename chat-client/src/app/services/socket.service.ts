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
  // -------------------------
  // SOCKET EVENTS
  // -------------------------
  setup(user: any) {
    this.socket.emit("setup", user);
  }

  joinChat(chatId: string) {
    this.socket.emit("join chat", chatId);
  }

  sendTyping(chatId: string) {
    this.socket.emit("typing", chatId);
  }

  stopTyping(chatId: string) {
    this.socket.emit("stop typing", chatId);
  }

  // -------------------------
  // SEND MESSAGE
  // -------------------------
  sendMessage(message: any) {
    this.socket.emit("new message", message);
  }

  // -------------------------
  // MESSAGE STATUS EVENTS
  // -------------------------
  emitMessageDelivered(messageId: string, userId: string) {
    this.socket.emit("message delivered", { messageId, userId });
  }

  emitMessageRead(messageId: string, userId: string) {
    this.socket.emit("message read", { messageId, userId });
  }

  emitMessagesRead(messageIds: string[], userId: string) {
    this.socket.emit("messages read", { messageIds, userId });
  }

  onMessageStatusUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on("message status updated", (data) => {
        observer.next(data);
      });
    });
  }

  // -------------------------
  // RECEIVE MESSAGES
  // -------------------------
  messageReceived(): Observable<any> {
    return new Observable(observer => {
      this.socket.on("message received", (newMessageRecieved) => {
        observer.next(newMessageRecieved);
      });
    });
  }

  typing(): Observable<any> {
    return new Observable(observer => {
      this.socket.on("typing", () => observer.next(null));
    });
  }

  stopTypingListener(): Observable<any> {
    return new Observable(observer => {
      this.socket.on("stop typing", () => observer.next(null));
    });
  }

  // -------------------------
  // AI EVENTS
  // -------------------------
  requestRewrite(text: string) {
    this.socket.emit("request rewrite", text);
  }

  onRewriteSuggestions(): Observable<any> {
    return new Observable(observer => {
      this.socket.on("rewrite suggestions", (data) => observer.next(data));
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
