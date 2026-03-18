import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { TokenResponse, UserProfile } from '../models/download.models';

const ACCESS_KEY  = 'wssd_access';
const REFRESH_KEY = 'wssd_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http       = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  readonly currentUser = signal<UserProfile | null>(null);
  readonly isLoggedIn  = computed(() => !!this.currentUser());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.tryRestoreSession();
    }
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
    this.storage('remove', ACCESS_KEY);
    this.storage('remove', REFRESH_KEY);
    this.currentUser.set(null);
    this.http.post('/api/auth/logout', {}).subscribe();
  }

  getAccessToken(): string | null {
    return this.storage('get', ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return this.storage('get', REFRESH_KEY);
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<TokenResponse>('/api/auth/refresh', { refreshToken }).pipe(
      tap(res => this.saveSession(res))
    );
  }

  storeSocialTokens(accessToken: string, refreshToken: string): void {
    this.storage('set', ACCESS_KEY, accessToken);
    this.storage('set', REFRESH_KEY, refreshToken);
    this.http.get<UserProfile>('/api/user/me').subscribe({
      next:  u  => this.currentUser.set(u),
      error: () => {}
    });
  }

  private saveSession(res: TokenResponse): void {
    this.storage('set', ACCESS_KEY, res.accessToken);
    this.storage('set', REFRESH_KEY, res.refreshToken);
    this.currentUser.set(res.user);
  }

  private tryRestoreSession(): void {
    const token = this.getAccessToken();
    if (!token) return;
    this.http.get<UserProfile>('/api/user/me').subscribe({
      next:  u  => this.currentUser.set(u),
      error: () => this.logout()
    });
  }

  /** Safe localStorage wrapper — no-op on the server (SSR). */
  private storage(op: 'get' | 'set' | 'remove', key: string, value?: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    if (op === 'get')    return localStorage.getItem(key);
    if (op === 'set')    { localStorage.setItem(key, value!); return null; }
    if (op === 'remove') { localStorage.removeItem(key); return null; }
    return null;
  }
}
