import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { tap } from "rxjs";

@Injectable({ providedIn: "root" })
export class AuthService {
  private API = "http://localhost:3000/auth";

  constructor(private http: HttpClient) {}

  signup(username: string, password: string) {
    return this.http.post(`${this.API}/signup`, { username, password });
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${this.API}/login`, { username, password })
      .pipe(
        tap(res => {
          localStorage.setItem("token", res.token);
          localStorage.setItem("username", username);
        })
      );
  }

  getToken() { return localStorage.getItem("token"); }
  getUsername() { return localStorage.getItem("username"); }
  isLoggedIn() { return !!this.getToken(); }

  logout() { localStorage.clear(); }
}
