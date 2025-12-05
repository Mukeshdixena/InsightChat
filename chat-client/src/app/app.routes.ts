import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ChatComponent } from './chat/chat.component';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: "", redirectTo: "login", pathMatch: "full" },
  { path: "login", component: LoginComponent },
  { path: "signup", component: SignupComponent },
  { path: "chat", component: ChatLayoutComponent },
  { path: "profile", component: ProfileComponent }
];
