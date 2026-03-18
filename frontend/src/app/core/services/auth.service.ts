import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { TokenResponse, UserProfile } from '../models/download.models';

const ACCESS_KEY  = 'wssd_access';
const REFRESH_KEY = 'wssd_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly currentUser = signal<UserProfile | null>(null);
  readonly isLoggedIn  = computed(() => !!this.currentUser());

  constructor() {
    this.tryRestoreSession();
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/login', { email, password }).pipe(
      tap(res => this.saveSession(res))
    );
  }

  register(email: string, password: string, displayName: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/register', { email, password, displayName }).pipe(
      tap(res => this.saveSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.currentUser.set(null);
    this.http.post('/api/auth/logout', {}).subscribe();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<TokenResponse>('/api/auth/refresh', { refreshToken }).pipe(
      tap(res => this.saveSession(res))
    );
  }

  storeSocialTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    // Restore user profile from the new token
    this.http.get<UserProfile>('/api/user/me').subscribe({
      next:  u  => this.currentUser.set(u),
      error: () => {}
    });
  }

  private saveSession(res: TokenResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    this.currentUser.set(res.user);
  }

  private tryRestoreSession(): void {
    const token = this.getAccessToken();
    if (!token) return;
    // Restore user by fetching profile
    this.http.get<UserProfile>('/api/user/me').subscribe({
      next:  u  => this.currentUser.set(u),
      error: () => this.logout()
    });
  }
}
