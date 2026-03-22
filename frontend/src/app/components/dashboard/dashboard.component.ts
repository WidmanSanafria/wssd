import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/authentication/authentication.service';
import { DownloadService } from '../../services/download/download.service';
import type { Download } from '../../model/download.models';

@Component({
  selector: 'wssd-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
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
