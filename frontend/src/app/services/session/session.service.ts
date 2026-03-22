import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { SessionStatus } from '../../model/download.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);

  readonly status = signal<SessionStatus | null>(null);

  readonly showAds    = computed(() => this.status()?.showAds ?? false);
  readonly remaining  = computed(() => this.status()?.remainingFree ?? 5);
  readonly isLoggedIn = computed(() => this.status()?.loggedIn ?? false);

  loadStatus(): void {
    this.http.get<SessionStatus>('/api/session/status').subscribe({
      next: s => this.status.set(s),
      error: () => {}
    });
  }
}
