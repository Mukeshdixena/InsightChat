import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message } from '../shared/models';

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private apiUrl = 'http://localhost:3000/messages';

    constructor(private http: HttpClient) { }

    getMessages(chatId: string): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.apiUrl}/${chatId}`);
    }

    sendMessage(content: string, chatId: string, userId: string, replyToId?: string): Observable<Message> {
        const body: any = { content, chatId, userId };
        if (replyToId) {
            body.replyTo = replyToId;
        }
        return this.http.post<Message>(this.apiUrl, body);
    }

    addReaction(messageId: string, emoji: string, userId: string): Observable<Message> {
        return this.http.post<Message>(`${this.apiUrl}/${messageId}/reaction`, { emoji, userId });
    }

    editMessage(messageId: string, content: string, userId: string): Observable<Message> {
        return this.http.put<Message>(`${this.apiUrl}/${messageId}`, { content, userId });
    }

    deleteMessage(messageId: string, userId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${messageId}`, { body: { userId } });
    }
}
