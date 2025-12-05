import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class SocketService {
private socket: Socket;


constructor() {
// Change origin to your server origin when deploying
this.socket = io('http://localhost:3000');
}


sendMessage(message: any) {
this.socket.emit('sendMessage', message);
}


receiveMessages(): Observable<any> {
return new Observable(observer => {
this.socket.on('receiveMessage', data => observer.next(data));
});
}
}