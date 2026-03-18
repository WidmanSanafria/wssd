import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DownloadService } from '../../core/services/download.service';
import type { Download } from '../../core/models/download.models';

@Component({
  selector: 'wssd-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="page">
  <header class="topbar neo">
    <a routerLink="/" class="back-link">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      Inicio
    </a>
    <span class="brand">WSSD</span>
    <button class="btn-logout neo-sm" (click)="logout()">Salir</button>
  </header>

  @if (auth.currentUser(); as user) {
    <div class="content">

      <!-- Profile card -->
      <div class="profile-card neo">
        <div class="avatar">{{ initial() }}</div>
        <div class="profile-info">
          <h1 class="profile-name">{{ user.displayName || user.email }}</h1>
          <p class="profile-email">{{ user.email }}</p>
          <span class="plan-badge" [class]="'plan-' + user.plan">
            {{ planLabel(user.plan) }}
          </span>
        </div>
        @if (user.plan === 'free') {
          <a routerLink="/pricing" class="btn-upgrade">⬆ Mejorar plan</a>
        }
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat neo-sm">
          <span class="stat-val">{{ history().length }}</span>
          <span class="stat-lbl">Descargas</span>
        </div>
        <div class="stat neo-sm">
          <span class="stat-val">{{ platformCount('facebook') }}</span>
          <span class="stat-lbl">Facebook</span>
        </div>
        <div class="stat neo-sm">
          <span class="stat-val">{{ platformCount('instagram') }}</span>
          <span class="stat-lbl">Instagram</span>
        </div>
        <div class="stat neo-sm">
          <span class="stat-val">{{ platformCount('tiktok') }}</span>
          <span class="stat-lbl">TikTok</span>
        </div>
      </div>

      <!-- History -->
      <div class="history-card neo">
        <h2 class="section-title">Historial de descargas</h2>
        @if (loadingHistory()) {
          <div class="empty">Cargando…</div>
        } @else if (history().length === 0) {
          <div class="empty">Aún no tienes descargas. <a routerLink="/">¡Empieza ahora!</a></div>
        } @else {
          <div class="table-wrap">
            <table class="history-table">
              <thead><tr><th>Plataforma</th><th>Video</th><th>Fecha</th></tr></thead>
              <tbody>
                @for (dl of history(); track dl.id) {
                  <tr>
                    <td><span class="plat-badge" [class]="dl.platform">{{ dl.platform }}</span></td>
                    <td class="title-cell">{{ dl.title ? (dl.title.length > 45 ? dl.title.slice(0,45) + '…' : dl.title) : dl.sourceUrl.slice(0,40) + '…' }}</td>
                    <td class="date-cell">{{ formatDate(dl.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

    </div>
  }
</div>`,
  styles: [`
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    :host {
      --bg:#e0e5ec; --shadow-l:#ffffff; --shadow-d:#a3b1c6; --text:#2d3748; --muted:#718096;
      --fb:#1877f2; --ig-a:#833ab4; --ig-b:#e1306c; --tt:#000; --green:#38a169;
      display:block; background:var(--bg); min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:var(--text);
    }
    .neo    { background:var(--bg); border-radius:18px; box-shadow:6px 6px 14px var(--shadow-d),-6px -6px 14px var(--shadow-l); }
    .neo-sm { background:var(--bg); border-radius:12px; box-shadow:4px 4px 10px var(--shadow-d),-4px -4px 10px var(--shadow-l); }

    .topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; position:sticky; top:0; z-index:10; border-radius:0; }
    .back-link { display:flex; align-items:center; gap:6px; text-decoration:none; font-weight:600; font-size:.9rem; color:var(--muted); }
    .brand { font-weight:900; font-size:1.1rem; background:linear-gradient(135deg,var(--fb),var(--ig-a)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .btn-logout { background:none; border:none; cursor:pointer; font-weight:600; font-size:.85rem; color:var(--muted); padding:6px 14px; border-radius:20px; box-shadow:3px 3px 7px var(--shadow-d),-2px -2px 5px var(--shadow-l); }

    .content { max-width:860px; margin:0 auto; padding:28px 20px 80px; display:flex; flex-direction:column; gap:24px; }

    .profile-card { padding:28px; display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
    .avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,var(--fb),var(--ig-a)); display:flex; align-items:center; justify-content:center; font-size:1.8rem; font-weight:900; color:#fff; flex-shrink:0; box-shadow:4px 4px 10px var(--shadow-d); }
    .profile-info { flex:1; }
    .profile-name { font-size:1.3rem; font-weight:800; margin-bottom:4px; }
    .profile-email { font-size:.85rem; color:var(--muted); margin-bottom:8px; }
    .plan-badge { padding:4px 14px; border-radius:20px; font-size:.75rem; font-weight:700; color:#fff; }
    .plan-free       { background:#718096; }
    .plan-pro        { background:linear-gradient(135deg,var(--fb),var(--ig-a)); }
    .plan-admin      { background:linear-gradient(135deg,#d4a017,#f59e0b); color:#000; }
    .plan-enterprise { background:linear-gradient(135deg,#1a1a2e,#16213e); }
    .btn-upgrade { margin-left:auto; padding:10px 20px; border-radius:12px; background:linear-gradient(135deg,var(--fb),var(--ig-a)); color:#fff; font-weight:700; font-size:.85rem; text-decoration:none; box-shadow:3px 3px 8px var(--shadow-d); white-space:nowrap; }

    .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .stat { padding:16px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:4px; }
    .stat-val { font-size:1.8rem; font-weight:900; background:linear-gradient(135deg,var(--fb),var(--ig-a)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .stat-lbl { font-size:.75rem; color:var(--muted); font-weight:600; }

    .history-card { padding:24px; }
    .section-title { font-size:1rem; font-weight:800; margin-bottom:16px; }
    .empty { padding:32px; text-align:center; color:var(--muted); }
    .empty a { color:var(--fb); }
    .table-wrap { overflow-x:auto; }
    .history-table { width:100%; border-collapse:collapse; font-size:.85rem; }
    .history-table th { text-align:left; padding:8px 12px; font-size:.75rem; font-weight:700; color:var(--muted); border-bottom:2px solid var(--shadow-d); }
    .history-table td { padding:10px 12px; border-bottom:1px solid var(--shadow-d); vertical-align:middle; }
    .history-table tr:last-child td { border-bottom:none; }
    .history-table tr:hover td { background:rgba(0,0,0,.02); }
    .plat-badge { padding:3px 10px; border-radius:8px; font-size:.72rem; font-weight:700; color:#fff; }
    .plat-badge.facebook  { background:var(--fb); }
    .plat-badge.instagram { background:linear-gradient(135deg,var(--ig-a),var(--ig-b)); }
    .plat-badge.tiktok    { background:#000; }
    .title-cell { color:var(--text); max-width:300px; }
    .date-cell  { color:var(--muted); white-space:nowrap; font-size:.8rem; }
    @media(max-width:600px) { .stats-row { grid-template-columns:repeat(2,1fr); } }
  `]
})
export class DashboardComponent implements OnInit {
  auth    = inject(AuthService);
  private dl     = inject(DownloadService);
  private router = inject(Router);

  history        = signal<Download[]>([]);
  loadingHistory = signal(true);

  ngOnInit(): void {
    this.dl.getHistory().subscribe({
      next:  h  => { this.history.set(h); this.loadingHistory.set(false); },
      error: () => this.loadingHistory.set(false)
    });
  }

  initial(): string {
    const u = this.auth.currentUser();
    return (u?.displayName || u?.email || '?').charAt(0).toUpperCase();
  }

  planLabel(plan: string): string {
    return ({ free:'Free', pro:'Pro', admin:'Admin', enterprise:'Enterprise' } as Record<string,string>)[plan] ?? plan;
  }

  platformCount(p: string): number {
    return this.history().filter(d => d.platform === p).length;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
