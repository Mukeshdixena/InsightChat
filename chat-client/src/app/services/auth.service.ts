import { Injectable } from '@angular/core';
import { api } from '../config/api';

@Injectable({ providedIn: 'root' })
export class AuthService {

  async login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    const token = res.data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('userId', res.data._id || res.data.userId); // Ensure backend sends this
    return res.data;
  }

  async signup(username: string, password: string) {
    const res = await api.post('/auth/signup', { username, password });
    return res.data;
  }

  async updateProfile(username: string, password: string) {
    const res = await api.put('/auth/update', { username, password });
    if (username) localStorage.setItem('username', username);
    return res.data;
  }

  getUsername() {
    return localStorage.getItem('username') || '';
  }

  getCurrentUser() {
    return {
      _id: localStorage.getItem('userId'),
      username: localStorage.getItem('username')
    };
  }

  getToken() {
    return localStorage.getItem('token') || '';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }
}
