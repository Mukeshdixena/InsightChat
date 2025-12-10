import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Message } from '../shared/models';
import { api } from '../config/api';

@Injectable({
    providedIn: 'root'
})
export class MessageService {

    constructor() { }

    getMessages(chatId: string): Observable<Message[]> {
        return from(api.get(`/messages/${chatId}`)).pipe(
            map(response => response.data)
        );
    }

    sendMessage(content: string, chatId: string, userId: string, replyToId?: string): Observable<Message> {
        const body: any = { content, chatId, userId };
        if (replyToId) {
            body.replyTo = replyToId;
        }
        return from(api.post('/messages', body)).pipe(
            map(response => response.data)
        );
    }

    addReaction(messageId: string, emoji: string, userId: string): Observable<Message> {
        return from(api.post(`/messages/${messageId}/reaction`, { emoji, userId })).pipe(
            map(response => response.data)
        );
    }

    editMessage(messageId: string, content: string, userId: string): Observable<Message> {
        return from(api.put(`/messages/${messageId}`, { content, userId })).pipe(
            map(response => response.data)
        );
    }

    deleteMessage(messageId: string, userId: string): Observable<any> {
        // Axios delete config for body is different than Angular's
        return from(api.delete(`/messages/${messageId}`, { data: { userId } })).pipe(
            map(response => response.data)
        );
    }
}
