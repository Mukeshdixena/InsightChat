import { Injectable } from '@angular/core';
import { api } from '../config/api';

@Injectable({ providedIn: 'root' })
export class AuthService {

  async login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    const token = res.data.token;

    localStorage.setItem('token', token);
    localStorage.setItem('username', username);

    return res.data;
  }

  async signup(username: string, password: string) {
    const res = await api.post('/auth/signup', { username, password });
    return res.data;
  }

  getUsername() {
    return localStorage.getItem('username') || '';
  }

  getToken() {
    return localStorage.getItem('token') || '';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }
}
