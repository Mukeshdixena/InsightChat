import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { SOCKET_EVENTS } from '../shared/constants';

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
  activeChatId: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor() {
    this.initializeSocket();
  }

  /**
   * Sets the currently active chat ID to suppress notifications
   * @param chatId - The ID of the active chat
   */
  setActiveChat(chatId: string) {
    this.activeChatId.next(chatId);
  }

  /**
   * Clears the active chat ID
   */
  clearActiveChat() {
    this.activeChatId.next(null);
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
  // SOCKET EVENTS
  // -------------------------

  // Initialize the user's connection on the server
  setup(user: any) {
    this.socket.emit(SOCKET_EVENTS.SETUP, user);
  }

  // Joins a specific chat room to start receiving messages
  joinChat(chatId: string) {
    this.socket.emit(SOCKET_EVENTS.JOIN_CHAT, chatId);
  }

  // Notifies the room that this user is typing...
  sendTyping(chatId: string) {
    this.socket.emit(SOCKET_EVENTS.TYPING, chatId);
  }

  // Tells the room that the user stopped typing
  stopTyping(chatId: string) {
    this.socket.emit(SOCKET_EVENTS.STOP_TYPING, chatId);
  }

  // -------------------------
  // SEND MESSAGE
  // -------------------------

  // Fires off a new message to the server
  sendMessage(message: any) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.NEW, message);
  }

  // -------------------------
  // MESSAGE STATUS EVENTS
  // -------------------------

  emitMessageDelivered(messageId: string, userId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.DELIVERED, { messageId, userId });
  }

  emitMessageRead(messageId: string, userId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.READ, { messageId, userId });
  }

  emitMessagesRead(messageIds: string[], userId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.BATCH_READ, { messageIds, userId });
  }

  // Listen for updates on delivery or read status
  onMessageStatusUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.STATUS_UPDATED, (data) => {
        observer.next(data);
      });
    });
  }

  // -------------------------
  // RECEIVE MESSAGES
  // -------------------------

  // Subscribe to incoming messages from the server
  messageReceived(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.RECEIVED, (newMessageRecieved) => {
        observer.next(newMessageRecieved);
      });
    });
  }

  // Watch for typing indicators
  typing(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.TYPING, () => observer.next(null));
    });
  }

  // Watch for when typing stops
  stopTypingListener(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.STOP_TYPING, () => observer.next(null));
    });
  }

  // -------------------------
  // AI EVENTS
  // -------------------------

  requestRewrite(text: string, customPrompt?: string) {
    this.socket.emit(SOCKET_EVENTS.AI.REQUEST_REWRITE, { text, customPrompt });
  }

  onRewriteSuggestions(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.AI.REWRITE_SUGGESTIONS, (data) => observer.next(data));
    });
  }

  // -------------------------
  // REACTION EVENTS
  // -------------------------

  emitReaction(messageId: string, emoji: string, userId: string, chatId: string) {
    this.socket.emit(SOCKET_EVENTS.REACTION.ADDED, { messageId, emoji, userId, chatId });
  }

  onReactionUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.REACTION.UPDATED, (data) => observer.next(data));
    });
  }

  // -------------------------
  // MESSAGE EDIT/DELETE EVENTS
  // -------------------------

  emitMessageEdit(messageId: string, content: string, chatId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.EDITED, { messageId, content, chatId });
  }

  emitMessageDelete(messageId: string, chatId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.DELETED, { messageId, chatId });
  }

  onMessageUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.UPDATED, (data) => observer.next(data));
    });
  }

  onMessageRemove(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.REMOVED, (data) => observer.next(data));
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
