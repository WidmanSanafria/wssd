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
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
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
      error: () => {
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
