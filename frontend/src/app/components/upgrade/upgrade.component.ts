import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/authentication/authentication.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'wssd-upgrade',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './upgrade.component.html',
  styleUrl: './upgrade.component.css'
})
export class UpgradeComponent implements OnInit, OnDestroy {
  private auth   = inject(AuthService);
  private http   = inject(HttpClient);
  private router = inject(Router);

  loading = signal(false);
  hours   = signal('24');
  minutes = signal('00');
  seconds = signal('00');
  annual  = false;

  private timer?: ReturnType<typeof setInterval>;
  private endTime!: number;

  ngOnInit(): void {
    // Countdown resets each visit (24h from now)
    this.endTime = Date.now() + 24 * 60 * 60 * 1000;
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private tick(): void {
    const diff = Math.max(0, this.endTime - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    this.hours.set(String(h).padStart(2, '0'));
    this.minutes.set(String(m).padStart(2, '0'));
    this.seconds.set(String(s).padStart(2, '0'));
  }

  startCheckout(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/register'], { queryParams: { next: 'upgrade' } });
      return;
    }
    this.loading.set(true);
    this.http.post<{ url: string }>('/api/billing/checkout', { plan: 'pro' }).subscribe({
      next:  res => { window.location.href = res.url; },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.url?.startsWith('ERROR:')
          ? err.error.url.replace('ERROR: ', '')
          : 'Error al procesar el pago. Por favor intenta de nuevo.';
        alert('❌ ' + msg);
      }
    });
  }
}
