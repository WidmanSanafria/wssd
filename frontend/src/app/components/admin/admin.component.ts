import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/authentication/authentication.service';

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  freeUsers: number;
  totalDownloads: number;
  byPlatform: { facebook: number; instagram: number; tiktok: number };
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  plan: string;
  createdAt: string;
  googleId: boolean;
  downloads: number;
}

interface AdminDownload {
  id: string;
  platform: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  userId: string;
  hadAds: boolean;
}

@Component({
  selector: 'wssd-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="admin-page">
  <!-- Header -->
  <header class="admin-header">
    <div class="admin-header-inner">
      <a routerLink="/" class="back-link">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        Inicio
      </a>
      <div class="admin-title-wrap">
        <span class="admin-badge">ADMIN</span>
        <h1 class="admin-title">Panel de Administración</h1>
      </div>
      <span class="admin-user-pill">{{ auth.currentUser()?.email }}</span>
    </div>
  </header>

  <main class="admin-main">

    <!-- Loading / Error states -->
    @if (loading()) {
      <div class="loading-wrap">
        <div class="spinner"></div>
        <p>Cargando datos…</p>
      </div>
    }

    @if (error()) {
      <div class="error-box neo-inset">
        ⚠️ {{ error() }}
      </div>
    }

    @if (!loading() && !error()) {

      <!-- Stats cards -->
      @if (stats()) {
        <section class="stats-grid">
          <div class="stat-card neo">
            <div class="stat-icon users-icon">👥</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats()!.totalUsers }}</span>
              <span class="stat-label">Total usuarios</span>
            </div>
          </div>
          <div class="stat-card neo">
            <div class="stat-icon pro-icon">⭐</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats()!.proUsers }}</span>
              <span class="stat-label">Usuarios Pro</span>
            </div>
          </div>
          <div class="stat-card neo">
            <div class="stat-icon ent-icon">🏢</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats()!.enterpriseUsers }}</span>
              <span class="stat-label">Enterprise</span>
            </div>
          </div>
          <div class="stat-card neo">
            <div class="stat-icon dl-icon">📥</div>
            <div class="stat-info">
              <span class="stat-value">{{ stats()!.totalDownloads }}</span>
              <span class="stat-label">Total descargas</span>
            </div>
          </div>
        </section>

        <!-- Platform stats -->
        <section class="platform-stats neo">
          <h3 class="section-subtitle">Descargas por plataforma</h3>
          <div class="platform-row">
            <div class="platform-item">
              <span class="plat-badge fb">Facebook</span>
              <span class="plat-count">{{ stats()!.byPlatform.facebook }}</span>
            </div>
            <div class="platform-item">
              <span class="plat-badge ig">Instagram</span>
              <span class="plat-count">{{ stats()!.byPlatform.instagram }}</span>
            </div>
            <div class="platform-item">
              <span class="plat-badge tt">TikTok</span>
              <span class="plat-count">{{ stats()!.byPlatform.tiktok }}</span>
            </div>
          </div>
        </section>
      }

      <!-- Tabs -->
      <div class="tabs-wrap">
        <button class="tab-btn" [class.active]="activeTab() === 'users'" (click)="setTab('users')">
          Usuarios <span class="tab-count">{{ usersTotal() }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'downloads'" (click)="setTab('downloads')">
          Descargas <span class="tab-count">{{ downloads().length }}</span>
        </button>
      </div>

      <!-- Users tab -->
      @if (activeTab() === 'users') {
        <section class="tab-content">
          <div class="search-bar">
            <input
              class="search-input neo-inset"
              type="text"
              placeholder="Buscar por email o nombre…"
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
            />
            <button class="refresh-btn neo" (click)="loadUsers()">
              ↺ Actualizar
            </button>
          </div>

          <div class="table-wrap neo">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Registro</th>
                  <th>Descargas</th>
                  <th>Auth</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td class="email-cell">{{ user.email }}</td>
                    <td>{{ user.displayName || '—' }}</td>
                    <td>
                      <span class="plan-badge" [ngClass]="'plan-' + user.plan">{{ user.plan }}</span>
                    </td>
                    <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
                    <td class="num-cell">{{ user.downloads }}</td>
                    <td>
                      @if (user.googleId) {
                        <span class="auth-badge google">Google</span>
                      } @else {
                        <span class="auth-badge email">Email</span>
                      }
                    </td>
                    <td>
                      <div class="plan-change-wrap">
                        <select class="plan-select neo-inset" [ngModel]="user.plan" (ngModelChange)="changePlan(user, $event)">
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="enterprise">enterprise</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                }
                @if (users().length === 0) {
                  <tr>
                    <td colspan="7" class="empty-cell">No hay usuarios que mostrar</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="pagination">
            <button class="page-btn neo" (click)="prevPage()" [disabled]="usersPage() === 0">
              ← Anterior
            </button>
            <span class="page-info">Página {{ usersPage() + 1 }} · {{ usersTotal() }} usuarios</span>
            <button class="page-btn neo" (click)="nextPage()" [disabled]="(usersPage() + 1) * pageSize >= usersTotal()">
              Siguiente →
            </button>
          </div>
        </section>
      }

      <!-- Downloads tab -->
      @if (activeTab() === 'downloads') {
        <section class="tab-content">
          <div class="search-bar">
            <button class="refresh-btn neo" (click)="loadDownloads()">
              ↺ Actualizar
            </button>
          </div>

          <div class="table-wrap neo">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Plataforma</th>
                  <th>Título</th>
                  <th>Fecha</th>
                  <th>Usuario ID</th>
                  <th>Anuncios</th>
                </tr>
              </thead>
              <tbody>
                @for (dl of downloads(); track dl.id) {
                  <tr>
                    <td>
                      <span class="plat-badge" [ngClass]="dl.platform">{{ dl.platform }}</span>
                    </td>
                    <td class="title-cell" [title]="dl.title || dl.sourceUrl">
                      {{ truncate(dl.title || dl.sourceUrl, 50) }}
                    </td>
                    <td class="date-cell">{{ formatDate(dl.createdAt) }}</td>
                    <td class="id-cell">{{ dl.userId ? dl.userId.slice(0, 8) + '…' : 'anon' }}</td>
                    <td>
                      @if (dl.hadAds) {
                        <span class="ads-badge yes">Sí</span>
                      } @else {
                        <span class="ads-badge no">No</span>
                      }
                    </td>
                  </tr>
                }
                @if (downloads().length === 0) {
                  <tr>
                    <td colspan="5" class="empty-cell">No hay descargas que mostrar</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    }
  </main>
</div>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :host {
      --bg: #e0e5ec;
      --card: #e0e5ec;
      --shadow-l: #ffffff;
      --shadow-d: #a3b1c6;
      --text: #2d3748;
      --muted: #718096;
      --radius: 18px;
      --fb: #1877f2;
      --ig-a: #833ab4;
      --ig-b: #e1306c;
      --green: #38a169;
      --accent: #5a67d8;
      display: block;
      background: var(--bg);
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
    }
    .neo       { background: var(--card); border-radius: var(--radius); box-shadow: 6px 6px 14px var(--shadow-d), -6px -6px 14px var(--shadow-l); }
    .neo-inset { background: var(--card); border-radius: var(--radius); box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); }

    /* Header */
    .admin-header { background: var(--bg); padding: 0 24px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px var(--shadow-d); }
    .admin-header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; height: 58px; gap: 16px; }
    .back-link { display: flex; align-items: center; gap: 6px; font-size: .85rem; font-weight: 600; color: var(--muted); text-decoration: none; padding: 6px 12px; border-radius: 20px; box-shadow: 3px 3px 7px var(--shadow-d), -2px -2px 5px var(--shadow-l); flex-shrink: 0; }
    .admin-title-wrap { display: flex; align-items: center; gap: 10px; flex: 1; }
    .admin-badge { background: linear-gradient(135deg, var(--ig-a), var(--ig-b)); color: #fff; font-size: .7rem; font-weight: 800; padding: 3px 10px; border-radius: 10px; letter-spacing: 1px; }
    .admin-title { font-size: 1.1rem; font-weight: 800; color: var(--text); }
    .admin-user-pill { font-size: .78rem; color: var(--muted); background: var(--bg); padding: 4px 12px; border-radius: 20px; box-shadow: 3px 3px 7px var(--shadow-d), -2px -2px 5px var(--shadow-l); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Main */
    .admin-main { max-width: 1200px; margin: 0 auto; padding: 28px 24px 80px; display: flex; flex-direction: column; gap: 24px; }

    /* Loading/Error */
    .loading-wrap { text-align: center; padding: 60px; color: var(--muted); display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .spinner { width: 40px; height: 40px; border: 4px solid var(--shadow-d); border-top-color: var(--ig-a); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-box { padding: 16px 20px; color: #c53030; font-size: .9rem; }

    /* Stats grid */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card { padding: 20px 22px; display: flex; align-items: center; gap: 14px; }
    .stat-icon { font-size: 2rem; flex-shrink: 0; }
    .stat-info { display: flex; flex-direction: column; gap: 2px; }
    .stat-value { font-size: 1.8rem; font-weight: 900; color: var(--text); line-height: 1; }
    .stat-label { font-size: .78rem; color: var(--muted); font-weight: 600; }

    /* Platform stats */
    .platform-stats { padding: 20px 24px; }
    .section-subtitle { font-size: .9rem; font-weight: 700; color: var(--muted); margin-bottom: 14px; text-transform: uppercase; letter-spacing: .5px; }
    .platform-row { display: flex; gap: 24px; flex-wrap: wrap; }
    .platform-item { display: flex; align-items: center; gap: 10px; }
    .plat-count { font-size: 1.4rem; font-weight: 800; color: var(--text); }

    /* Platform badges */
    .plat-badge { padding: 3px 12px; border-radius: 20px; font-size: .75rem; font-weight: 700; color: #fff; display: inline-block; }
    .plat-badge.facebook, .plat-badge.fb { background: var(--fb); }
    .plat-badge.instagram, .plat-badge.ig { background: linear-gradient(135deg, var(--ig-a), var(--ig-b)); }
    .plat-badge.tiktok, .plat-badge.tt { background: #000; }

    /* Tabs */
    .tabs-wrap { display: flex; gap: 4px; background: var(--bg); border-radius: 40px; padding: 5px; box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); align-self: flex-start; }
    .tab-btn { padding: 8px 22px; border: none; border-radius: 30px; background: transparent; font-size: .9rem; font-weight: 600; color: var(--muted); cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 8px; }
    .tab-btn.active { background: linear-gradient(135deg, var(--fb), var(--ig-a)); color: #fff; box-shadow: 3px 3px 8px var(--shadow-d); }
    .tab-count { background: rgba(255,255,255,.3); border-radius: 10px; padding: 1px 7px; font-size: .75rem; }
    .tab-btn:not(.active) .tab-count { background: rgba(0,0,0,.08); }

    /* Tab content */
    .tab-content { display: flex; flex-direction: column; gap: 16px; }

    /* Search bar */
    .search-bar { display: flex; gap: 12px; align-items: center; }
    .search-input { flex: 1; max-width: 400px; border: none; background: transparent; padding: 11px 16px; font-size: .9rem; color: var(--text); outline: none; }
    .refresh-btn { padding: 10px 20px; border: none; border-radius: 12px; font-size: .85rem; font-weight: 700; color: var(--muted); cursor: pointer; }

    /* Table */
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    .data-table th { padding: 14px 16px; text-align: left; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); border-bottom: 2px solid rgba(163,177,198,.3); white-space: nowrap; }
    .data-table td { padding: 12px 16px; border-bottom: 1px solid rgba(163,177,198,.2); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: rgba(163,177,198,.08); }
    .email-cell { font-weight: 600; color: var(--text); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .title-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: .82rem; }
    .date-cell { color: var(--muted); font-size: .82rem; white-space: nowrap; }
    .num-cell { text-align: right; font-weight: 700; }
    .id-cell { font-family: monospace; font-size: .78rem; color: var(--muted); }
    .empty-cell { text-align: center; color: var(--muted); padding: 32px; font-style: italic; }

    /* Plan badges */
    .plan-badge { padding: 3px 10px; border-radius: 10px; font-size: .72rem; font-weight: 700; display: inline-block; }
    .plan-free { background: rgba(113,128,150,.15); color: var(--muted); }
    .plan-pro { background: linear-gradient(135deg, rgba(24,119,242,.15), rgba(131,58,180,.15)); color: var(--ig-a); }
    .plan-enterprise { background: linear-gradient(135deg, rgba(131,58,180,.2), rgba(225,48,108,.2)); color: var(--ig-b); }
    .plan-admin { background: linear-gradient(135deg, #e53e3e, #c53030); color: #fff; }

    /* Auth badges */
    .auth-badge { padding: 2px 8px; border-radius: 8px; font-size: .7rem; font-weight: 700; }
    .auth-badge.google { background: rgba(66,133,244,.15); color: #4285f4; }
    .auth-badge.email { background: rgba(56,161,105,.15); color: var(--green); }

    /* Ads badge */
    .ads-badge { padding: 2px 8px; border-radius: 8px; font-size: .72rem; font-weight: 700; }
    .ads-badge.yes { background: rgba(229,62,62,.15); color: #e53e3e; }
    .ads-badge.no { background: rgba(56,161,105,.15); color: var(--green); }

    /* Plan change select */
    .plan-change-wrap { display: flex; align-items: center; gap: 8px; }
    .plan-select { border: none; background: transparent; padding: 6px 10px; font-size: .82rem; font-weight: 600; color: var(--text); cursor: pointer; border-radius: 10px; outline: none; min-width: 100px; }

    /* Pagination */
    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0; }
    .page-btn { padding: 8px 18px; border: none; border-radius: 12px; font-size: .85rem; font-weight: 600; color: var(--muted); cursor: pointer; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-info { font-size: .85rem; color: var(--muted); }

    /* Responsive */
    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .admin-header-inner { gap: 8px; }
      .admin-title { font-size: .9rem; }
      .stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
      .stat-card { padding: 14px 16px; }
      .stat-value { font-size: 1.4rem; }
      .admin-main { padding: 16px 12px 60px; gap: 16px; }
      .data-table th, .data-table td { padding: 10px 12px; }
    }
  `]
})
export class AdminComponent implements OnInit {
  auth   = inject(AuthService);
  private http   = inject(HttpClient);
  private router = inject(Router);

  readonly pageSize = 50;

  loading   = signal(true);
  error     = signal<string | null>(null);
  stats     = signal<AdminStats | null>(null);
  users     = signal<AdminUser[]>([]);
  usersTotal = signal(0);
  usersPage = signal(0);
  downloads = signal<AdminDownload[]>([]);
  activeTab = signal<'users' | 'downloads'>('users');

  searchQuery = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || user.plan !== 'admin') {
      this.router.navigate(['/']);
      return;
    }
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<AdminStats>('/api/admin/stats').subscribe({
      next: s => {
        this.stats.set(s);
        this.loadUsers();
        this.loadDownloads();
      },
      error: err => {
        this.error.set('Error cargando datos del panel. Verifica que tienes permisos de administrador.');
        this.loading.set(false);
      }
    });
  }

  loadUsers(): void {
    const params: Record<string, string | number> = {
      page: this.usersPage(),
      size: this.pageSize
    };
    if (this.searchQuery.trim()) {
      params['search'] = this.searchQuery.trim();
    }
    this.http.get<{ users: AdminUser[]; total: number }>('/api/admin/users', { params }).subscribe({
      next: res => {
        this.users.set(res.users);
        this.usersTotal.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadDownloads(): void {
    this.http.get<AdminDownload[]>('/api/admin/downloads', { params: { page: 0, size: 100 } }).subscribe({
      next: list => this.downloads.set(list),
      error: () => {}
    });
  }

  setTab(tab: 'users' | 'downloads'): void {
    this.activeTab.set(tab);
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.usersPage.set(0);
      this.loadUsers();
    }, 350);
  }

  changePlan(user: AdminUser, newPlan: string): void {
    if (newPlan === user.plan) return;
    this.http.put<{ ok: boolean; plan: string }>(`/api/admin/users/${user.id}/plan`, { plan: newPlan }).subscribe({
      next: res => {
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, plan: res.plan } : u));
      },
      error: () => {
        alert('Error al cambiar el plan. Inténtalo de nuevo.');
      }
    });
  }

  prevPage(): void {
    if (this.usersPage() > 0) {
      this.usersPage.update(p => p - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    if ((this.usersPage() + 1) * this.pageSize < this.usersTotal()) {
      this.usersPage.update(p => p + 1);
      this.loadUsers();
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  truncate(str: string, max: number): string {
    if (!str) return '—';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }
}
