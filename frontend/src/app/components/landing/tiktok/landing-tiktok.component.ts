import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'wssd-landing-tiktok',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="page">
  <header><a routerLink="/" style="text-decoration:none;color:#2d3748;font-weight:900">← WSSD</a></header>
  <section class="hero">
    <h1>Descargar Videos de TikTok Gratis</h1>
    <p>Pega el enlace y descarga en HD. Sin registro, sin instalar nada.</p>
    <div class="search neo">
      <input type="url" [(ngModel)]="url" placeholder="Pega el enlace de TikTok aquí" class="neo-inset" (keydown.enter)="go()" />
      <button (click)="go()" class="btn">Descargar</button>
    </div>
  </section>
  <section class="features">
    <h2>¿Por qué WSSD para TikTok?</h2>
    <div class="cards">
      <div class="card neo">🚀 Rápido y gratis</div>
      <div class="card neo">📱 Funciona en móvil</div>
      <div class="card neo">🎬 Calidad HD</div>
      <div class="card neo">🔒 Sin registro</div>
    </div>
  </section>
</div>`,
  styles: [`
    :host { --bg:#e0e5ec; --shadow-l:#ffffff; --shadow-d:#a3b1c6; display:block; background:var(--bg); min-height:100vh; font-family:sans-serif; color:#2d3748; }
    .neo { background:var(--bg); border-radius:18px; box-shadow:6px 6px 14px var(--shadow-d),-6px -6px 14px var(--shadow-l); }
    .neo-inset { background:var(--bg); border-radius:12px; box-shadow:inset 4px 4px 10px var(--shadow-d),inset -4px -4px 10px var(--shadow-l); }
    header { padding:16px 28px; }
    .page { max-width:900px; margin:0 auto; padding:0 24px 60px; }
    .hero { text-align:center; padding:48px 0 32px; }
    h1 { font-size:2rem; font-weight:900; margin-bottom:12px; }
    .search { display:flex; gap:10px; padding:10px; max-width:640px; margin:24px auto 0; }
    input { flex:1; border:none; padding:14px 16px; font-size:1rem; outline:none; border-radius:12px; background:transparent; }
    .btn { padding:14px 24px; border:none; background:linear-gradient(135deg,#1877f2,#833ab4); color:#fff; border-radius:12px; font-weight:700; cursor:pointer; }
    .features { padding:32px 0; }
    h2 { font-size:1.3rem; font-weight:800; margin-bottom:20px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:16px; }
    .card { padding:20px; text-align:center; font-weight:600; }
  `]
})
export class LandingTikTokComponent implements OnInit {
  private meta   = inject(Meta);
  private title  = inject(Title);
  private router = inject(Router);
  url = '';

  ngOnInit(): void {
    this.title.setTitle('Descargar Videos de TikTok Gratis 2026 | WSSD');
    this.meta.updateTag({ name: 'description', content: 'Descarga videos de TikTok gratis en HD. Sin instalar nada. WSSD — WS Social Downloader.' });
  }

  go(): void {
    if (this.url.trim()) this.router.navigate(['/'], { queryParams: { url: this.url.trim() } });
  }
}
