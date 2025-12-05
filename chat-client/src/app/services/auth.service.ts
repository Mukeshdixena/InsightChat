import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class AuthService {

  private API = "http://localhost:3000/auth";

  constructor(private http: HttpClient) {}

  signup(username: string, password: string) {
    return this.http.post(`${this.API}/signup`, { username, password });
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${this.API}/login`, { username, password });
  }

  saveToken(token: string) {
    localStorage.setItem("token", token);
  }

  getToken() {
    return localStorage.getItem("token");
  }

  logout() {
    localStorage.removeItem("token");
  }

  isLoggedIn() {
    return !!localStorage.getItem("token");
  }
}
