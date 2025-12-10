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
  activeChatId = new BehaviorSubject<string | null>(null);

  constructor() {
    this.initializeSocket();
  }

  // Marks which chat is currently open
  setActiveChat(chatId: string) {
    this.activeChatId.next(chatId);
  }

  // Clears the active chat state
  clearActiveChat() {
    this.activeChatId.next(null);
  }

  // Creates and configures the socket connection
  private initializeSocket() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.warn('Disconnected from WebSocket server');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });
  }

  // Registers the user
  setup(user: any) {
    this.socket.emit(SOCKET_EVENTS.SETUP, user);
  }

  // Joins a chat room
  joinChat(chatId: string) {
    this.socket.emit(SOCKET_EVENTS.JOIN_CHAT, chatId);
  }

  // Sends typing indicator
  sendTyping(chatId: string) {
    this.socket.emit(SOCKET_EVENTS.TYPING, chatId);
  }

  // Stops typing indicator
  stopTyping(chatId: string) {
    this.socket.emit(SOCKET_EVENTS.STOP_TYPING, chatId);
  }

  // Sends a new message
  sendMessage(message: any) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.NEW, message);
  }

  // Message status events
  emitMessageDelivered(messageId: string, userId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.DELIVERED, { messageId, userId });
  }

  emitMessageRead(messageId: string, userId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.READ, { messageId, userId });
  }

  emitMessagesRead(messageIds: string[], userId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.BATCH_READ, { messageIds, userId });
  }

  // Listens for message status updates
  onMessageStatusUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.STATUS_UPDATED, data => observer.next(data));
    });
  }

  // Listens for new messages
  messageReceived(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.RECEIVED, msg => observer.next(msg));
    });
  }

  // Listens for typing
  typing(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.TYPING, () => observer.next(null));
    });
  }

  // Listens for typing stop
  stopTypingListener(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.STOP_TYPING, () => observer.next(null));
    });
  }

  // AI rewrite request
  requestRewrite(text: string, customPrompt?: string) {
    this.socket.emit(SOCKET_EVENTS.AI.REQUEST_REWRITE, { text, customPrompt });
  }

  // AI rewrite suggestions
  onRewriteSuggestions(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.AI.REWRITE_SUGGESTIONS, data => observer.next(data));
    });
  }

  // Sends a reaction
  emitReaction(messageId: string, emoji: string, userId: string, chatId: string) {
    this.socket.emit(SOCKET_EVENTS.REACTION.ADDED, { messageId, emoji, userId, chatId });
  }

  // Listens for reaction updates
  onReactionUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.REACTION.UPDATED, data => observer.next(data));
    });
  }

  // Sends message edit
  emitMessageEdit(messageId: string, content: string, chatId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.EDITED, { messageId, content, chatId });
  }

  // Sends message delete
  emitMessageDelete(messageId: string, chatId: string) {
    this.socket.emit(SOCKET_EVENTS.MESSAGE.DELETED, { messageId, chatId });
  }

  // Listens for edit updates
  onMessageUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.UPDATED, data => observer.next(data));
    });
  }

  // Listens for message removal
  onMessageRemove(): Observable<any> {
    return new Observable(observer => {
      this.socket.on(SOCKET_EVENTS.MESSAGE.REMOVED, data => observer.next(data));
    });
  }

  // Cleans up the socket when service is destroyed
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
