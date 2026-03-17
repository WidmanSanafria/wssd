import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { DownloadService } from '../../core/services/download.service';
import { SessionService } from '../../core/services/session.service';
import type { VideoFormat, CarouselItem } from '../../core/models/download.models';

@Component({
  selector: 'wssd-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<header class="header">
  <div class="header-inner">
    <a class="logo" routerLink="/">
      <div class="logo-pill">
        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        <span class="logo-name">WSSD</span>
      </div>
      <span>WS Social Downloader</span>
    </a>
    <div class="header-badges">
      <span class="hbadge fb">Facebook</span>
      <span class="hbadge ig">Instagram</span>
      <span class="hbadge tt">TikTok</span>
    </div>
    <div class="header-nav">
      <a routerLink="/pricing" class="nav-link">Precios</a>
      <a routerLink="/login" class="nav-link">Iniciar sesión</a>
    </div>
  </div>
</header>

<main class="main">
  <section class="hero">
    <h1 class="hero-title">Descarga videos de redes sociales</h1>
    <p class="hero-sub">FACEBOOK · INSTAGRAM · TIKTOK</p>
    <p class="hero-desc">Gratis, sin instalar nada. HD, audio, carousels.</p>

    <div class="search-wrap neo">
      <input
        class="search-input neo-inset"
        type="url"
        [(ngModel)]="url"
        placeholder="Pega el enlace aquí — Facebook, Instagram o TikTok"
        (keydown.enter)="search()"
        [disabled]="dl.loading()"
      />
      <button class="search-btn" (click)="search()" [disabled]="dl.loading() || !url.trim()">
        @if (dl.loading()) {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
               style="animation:spin .8s linear infinite">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
        } @else {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        }
        {{ dl.loading() ? 'Analizando…' : 'Descargar' }}
      </button>
    </div>

    @if (dl.error()) {
      <div class="error-box neo-inset">⚠️ {{ dl.error() }}</div>
    }
  </section>

  <!-- Ads banner (descarga 2-5) -->
  @if (showAds() && !dl.result()) {
    <div class="ad-banner neo">
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-XXXXXXXX"
           data-ad-slot="banner_top"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  }

  <!-- Result card -->
  @if (dl.result(); as res) {
    <section class="result neo">
      <!-- Platform tag -->
      <span class="platform-tag" [ngClass]="res.platform">{{ res.platform }}</span>

      <div class="result-body">
        @if (res.thumbnail) {
          <img [src]="res.thumbnail" [alt]="res.title" class="thumb" loading="lazy" />
        }
        <div class="result-info">
          <h2 class="result-title">{{ res.title }}</h2>
          @if (res.uploader) { <p class="result-uploader">{{ res.uploader }}</p> }
          @if (res.duration) { <p class="result-duration">⏱ {{ formatDuration(res.duration) }}</p> }
        </div>
      </div>

      <!-- Ads mid (descarga 2-5) -->
      @if (showAds()) {
        <div class="ad-mid neo-inset">
          <span class="ad-label">Publicidad</span>
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="ca-pub-XXXXXXXX"
               data-ad-slot="banner_mid"
               data-ad-format="auto"></ins>
        </div>
      }

      <!-- Formats -->
      @if (res.formats.length > 0) {
        <div class="formats-list">
          @for (fmt of res.formats; track fmt.format_id) {
            <div class="format-row neo-sm">
              <div class="fmt-left">
                <span class="fmt-badge" [ngClass]="fmt.type === 'audio' ? 'audio' : isHD(fmt) ? 'hd' : 'sd'">
                  {{ fmt.type === 'audio' ? 'MP3' : 'MP4' }}
                </span>
                <span class="fmt-label">{{ fmt.label }}</span>
                <span class="fmt-size">{{ fmt.filesizeStr ?? 'Desconocido' }}</span>
              </div>
              <div class="fmt-right">
                @if (fmt.needs_merge || fmt.needs_ytdlp) {
                  <span class="merge-note">⚡ Procesado en servidor</span>
                  <button class="btn-dl hd" (click)="serverDownload(fmt, res.title)">
                    ↓ Descargar
                  </button>
                } @else {
                  <a class="btn-dl sd" [href]="dl.getProxyUrl(fmt.url!, res.title)" download>
                    ↓ Descargar
                  </a>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Carousel -->
      @if (res.carousel.length > 0) {
        <div class="carousel-section">
          <h3 class="carousel-title">{{ res.carousel.length }} elementos</h3>
          <div class="carousel-grid">
            @for (item of res.carousel; track item.index) {
              <div class="carousel-item neo-sm" (click)="downloadCarouselItem(item, res.title)">
                @if (item.thumb) {
                  <img [src]="item.thumb" [alt]="'Item ' + item.index" loading="lazy" />
                }
                <span class="item-type">{{ item.kind === 'video' ? '▶' : '🖼' }}</span>
                <span class="item-num">#{{ item.index }}</span>
              </div>
            }
          </div>
        </div>
      }
    </section>
  }

  <!-- Session counter -->
  @if (sess.status(); as s) {
    @if (!s.loggedIn && s.count > 0) {
      <div class="session-bar neo-inset">
        <span>{{ s.remainingFree > 0 ? s.remainingFree + ' descargas gratuitas restantes' : 'Límite alcanzado — regístrate para continuar' }}</span>
        @if (s.remainingFree === 0) {
          <a routerLink="/upgrade" class="btn-upgrade">Ver planes</a>
        }
      </div>
    }
  }
</main>

<!-- Progress overlay -->
@if (overlayVisible()) {
  <div class="dl-overlay">
    <div class="dl-modal neo">
      <div class="dl-spinner"></div>
      <h3>{{ overlayTitle() }}</h3>
      <p>{{ overlayDesc() }}</p>
      <div class="progress-track neo-inset">
        <div class="progress-fill" [style.width]="overlayProgress() + '%'"></div>
      </div>
      <p class="stage-text">{{ overlayStage() }}</p>
    </div>
  </div>
}

<footer class="footer">
  <p>© 2026 WSSD — WS Social Downloader | <a routerLink="/facebook">Facebook</a> · <a routerLink="/instagram">Instagram</a> · <a routerLink="/tiktok">TikTok</a></p>
</footer>
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
      --tt: #000;
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
    .neo-sm    { background: var(--card); border-radius: 12px; box-shadow: 4px 4px 10px var(--shadow-d), -4px -4px 10px var(--shadow-l); }

    .header { background: var(--bg); padding: 0 28px; box-shadow: 0 4px 10px var(--shadow-d); position: sticky; top: 0; z-index: 100; }
    .header-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; height: 62px; gap: 12px; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 10px; font-size: 1rem; font-weight: 800; text-decoration: none; color: var(--text); }
    .logo-pill { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)); border-radius: 30px; padding: 5px 13px; box-shadow: 3px 3px 8px var(--shadow-d); }
    .logo-pill svg { width: 18px; height: 18px; fill: #fff; }
    .logo-name { font-size: 1rem; font-weight: 800; color: #fff; }
    .header-badges { display: flex; gap: 8px; }
    .hbadge { font-size: .72rem; font-weight: 700; padding: 4px 11px; border-radius: 20px; box-shadow: 3px 3px 7px var(--shadow-d), -2px -2px 5px var(--shadow-l); }
    .hbadge.fb { color: var(--fb); }
    .hbadge.ig { background: linear-gradient(90deg, var(--ig-a), var(--ig-b)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hbadge.tt { color: #000; }
    .header-nav { display: flex; gap: 12px; }
    .nav-link { font-size: .85rem; font-weight: 600; color: var(--muted); text-decoration: none; padding: 6px 14px; border-radius: 20px; box-shadow: 3px 3px 7px var(--shadow-d), -2px -2px 5px var(--shadow-l); }

    .main { max-width: 900px; margin: 0 auto; padding: 32px 24px 80px; }
    .hero { text-align: center; padding: 40px 0 32px; }
    .hero-title { font-size: clamp(1.8rem, 5vw, 2.8rem); font-weight: 900; letter-spacing: -1px; background: linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-sub { font-size: .78rem; font-weight: 700; letter-spacing: 3px; color: var(--muted); margin: 8px 0 4px; }
    .hero-desc { color: var(--muted); margin-bottom: 32px; }
    .search-wrap { display: flex; align-items: center; gap: 12px; padding: 10px; max-width: 680px; margin: 0 auto; }
    .search-input { flex: 1; border: none; background: transparent; padding: 14px 16px; font-size: 1rem; color: var(--text); outline: none; border-radius: 14px; }
    .search-btn { display: flex; align-items: center; gap: 8px; padding: 14px 24px; border: none; cursor: pointer; border-radius: 14px; font-weight: 700; background: linear-gradient(135deg, var(--fb), var(--ig-a)); color: #fff; box-shadow: 3px 3px 8px var(--shadow-d); white-space: nowrap; }
    .search-btn:disabled { opacity: .6; cursor: not-allowed; }
    .error-box { margin: 16px auto; max-width: 680px; padding: 14px 20px; color: #c53030; font-size: .9rem; }
    .ad-banner { margin: 16px 0; padding: 16px; text-align: center; }
    .ad-mid { margin: 16px 0; padding: 12px; text-align: center; }
    .ad-label { display: block; font-size: .7rem; color: var(--muted); margin-bottom: 8px; }

    .result { margin: 24px 0; padding: 24px; }
    .platform-tag { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: .75rem; font-weight: 700; color: #fff; margin-bottom: 16px; }
    .platform-tag.facebook { background: var(--fb); }
    .platform-tag.instagram { background: linear-gradient(135deg, var(--ig-a), var(--ig-b)); }
    .platform-tag.tiktok { background: #000; }
    .result-body { display: flex; gap: 16px; margin-bottom: 20px; }
    .thumb { width: 140px; height: 100px; object-fit: cover; border-radius: 12px; flex-shrink: 0; }
    .result-title { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
    .result-uploader, .result-duration { font-size: .85rem; color: var(--muted); }
    .formats-list { display: flex; flex-direction: column; gap: 10px; }
    .format-row { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .fmt-left { display: flex; align-items: center; gap: 10px; }
    .fmt-badge { padding: 3px 10px; border-radius: 8px; font-size: .75rem; font-weight: 700; color: #fff; }
    .fmt-badge.hd { background: linear-gradient(135deg, var(--ig-a), var(--ig-b)); }
    .fmt-badge.sd { background: var(--fb); }
    .fmt-badge.audio { background: var(--green); }
    .fmt-label { font-size: .9rem; font-weight: 600; }
    .fmt-size { font-size: .8rem; color: var(--muted); }
    .fmt-right { display: flex; align-items: center; gap: 10px; }
    .merge-note { font-size: .75rem; color: var(--ig-a); font-weight: 600; }
    .btn-dl { padding: 8px 18px; border: none; border-radius: 10px; font-weight: 700; font-size: .85rem; cursor: pointer; text-decoration: none; display: inline-block; box-shadow: 3px 3px 8px var(--shadow-d), -2px -2px 6px var(--shadow-l); }
    .btn-dl.hd { background: linear-gradient(135deg, var(--ig-a), var(--ig-b)); color: #fff; }
    .btn-dl.sd { background: var(--fb); color: #fff; }
    .carousel-section { margin-top: 20px; }
    .carousel-title { font-size: .9rem; font-weight: 700; margin-bottom: 12px; color: var(--muted); }
    .carousel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
    .carousel-item { position: relative; aspect-ratio: 1; overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .carousel-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
    .item-type { position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,.5); color: #fff; border-radius: 6px; padding: 2px 6px; font-size: .75rem; }
    .item-num  { position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,.5); color: #fff; border-radius: 6px; padding: 2px 6px; font-size: .75rem; }
    .session-bar { margin: 20px 0; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; font-size: .85rem; }
    .btn-upgrade { padding: 6px 16px; background: linear-gradient(135deg, var(--fb), var(--ig-a)); color: #fff; border-radius: 10px; text-decoration: none; font-weight: 700; }
    .footer { text-align: center; padding: 24px; font-size: .8rem; color: var(--muted); }
    .footer a { color: var(--muted); text-decoration: none; }

    .dl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
    .dl-modal { padding: 32px; max-width: 400px; width: 90%; text-align: center; }
    .dl-spinner { width: 48px; height: 48px; border: 4px solid var(--shadow-d); border-top-color: var(--ig-a); border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 16px; }
    .dl-modal h3 { font-size: 1.1rem; margin-bottom: 8px; }
    .dl-modal p { font-size: .85rem; color: var(--muted); margin-bottom: 16px; }
    .progress-track { height: 8px; margin: 12px 0; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--fb), var(--ig-a)); border-radius: 4px; transition: width .5s ease; }
    .stage-text { font-size: .8rem; color: var(--muted); margin-top: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class HomeComponent implements OnInit {
  dl   = inject(DownloadService);
  sess = inject(SessionService);
  private route = inject(ActivatedRoute);
  private meta  = inject(Meta);
  private title = inject(Title);

  url = '';
  showAds = computed(() => this.dl.result()
    ? (this.dl.result()!.adsConfig?.length ?? 0) > 0
    : this.sess.showAds()
  );

  // Overlay state
  overlayVisible  = signal(false);
  overlayTitle    = signal('');
  overlayDesc     = signal('');
  overlayStage    = signal('');
  overlayProgress = signal(0);
  private stageTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.title.setTitle('WSSD – Descargador de Videos | Facebook, Instagram, TikTok');
    this.meta.updateTag({ name: 'description', content: 'Descarga videos de Facebook, Instagram y TikTok gratis. Sin instalar nada. HD, audio MP3, carousels.' });
    this.sess.loadStatus();

    // Pre-fill URL from query param (from landing pages)
    this.route.queryParams.subscribe(p => {
      if (p['url']) { this.url = p['url']; this.search(); }
    });
  }

  search(): void {
    const u = this.url.trim();
    if (!u || this.dl.loading()) return;
    this.dl.getInfo(u).subscribe();
  }

  async serverDownload(fmt: VideoFormat, title: string): Promise<void> {
    const isTT = fmt.needs_ytdlp ?? false;
    let dlUrl: string;

    if (isTT) {
      dlUrl = this.dl.getYtdlpUrl(fmt.page_url ?? '', fmt.format_id, title);
    } else {
      dlUrl = this.dl.getMergeUrl(fmt.url ?? '', fmt.audio_url ?? '', title);
    }

    this.showOverlay(isTT);
    try {
      const r = await fetch(dlUrl);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert('❌ ' + (d.error ?? d.detail ?? 'Error al procesar el video.'));
        return;
      }
      const blob = await r.blob();
      const ext  = blob.type.includes('webm') ? '.webm' : '.mp4';
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `${title}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.hideOverlay();
    }
  }

  downloadCarouselItem(item: CarouselItem, title: string): void {
    const ext = item.kind === 'image' ? '.jpg' : '.mp4';
    const dlUrl = this.dl.getProxyUrl(item.url, `${title}_${item.index}`);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `${title}_${item.index}${ext}`;
    a.click();
  }

  formatDuration(secs: number): string {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  isHD(fmt: VideoFormat): boolean {
    return fmt.quality.toLowerCase().includes('hd') || fmt.needs_merge;
  }

  private showOverlay(isTT: boolean): void {
    const stages = isTT
      ? ['🔍 Extrayendo URL…', '📥 Descargando video…', '🔊 Descargando audio…', '⚙️ Combinando…', '✅ Preparando archivo…']
      : ['📥 Descargando video…', '🔊 Descargando audio…', '⚙️ Combinando con ffmpeg…', '✅ Preparando…'];

    this.overlayTitle.set(isTT ? 'Procesando video de TikTok…' : 'Procesando video HD…');
    this.overlayDesc.set('El servidor está procesando el video. Por favor espera.');
    this.overlayStage.set(stages[0]);
    this.overlayProgress.set(0);
    this.overlayVisible.set(true);

    let idx = 0;
    const interval = isTT ? 18000 / stages.length : 12000 / stages.length;
    this.stageTimer = setInterval(() => {
      if (idx < stages.length) {
        this.overlayStage.set(stages[idx]);
        this.overlayProgress.set(Math.min(85, (idx + 1) * (85 / stages.length)));
        idx++;
      }
    }, interval);
  }

  private hideOverlay(): void {
    clearInterval(this.stageTimer);
    this.overlayProgress.set(100);
    this.overlayStage.set('✅ Descarga lista');
    setTimeout(() => { this.overlayVisible.set(false); this.overlayProgress.set(0); }, 900);
  }
}
