import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { DownloadService } from '../../services/download/download.service';
import { SessionService } from '../../services/session/session.service';
import { AuthService } from '../../services/authentication/authentication.service';
import type { VideoFormat, CarouselItem } from '../../model/download.models';

@Component({
  selector: 'wssd-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  dl   = inject(DownloadService);
  sess = inject(SessionService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private meta  = inject(Meta);
  private title = inject(Title);

  url = '';
  bannerDismissed = signal(false);
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

  logout(): void { this.auth.logout(); }

  search(): void {
    const u = this.url.trim();
    if (!u || this.dl.loading()) return;
    this.dl.getInfo(u).subscribe();
  }

  serverDownload(fmt: VideoFormat, title: string): void {
    const isTT = fmt.needs_ytdlp ?? false;
    const dlUrl = isTT
      ? this.dl.getYtdlpUrl(fmt.page_url ?? '', fmt.format_id, title)
      : this.dl.getMergeUrl(fmt.url ?? '', fmt.audio_url ?? '', title);

    // Descarga directa: el navegador maneja el download nativamente.
    // Funciona en iOS Safari, Android y todos los browsers de escritorio.
    // El servidor envía Content-Disposition: attachment que dispara la descarga.
    this.showOverlay(isTT);

    // Creamos un <a> invisible y lo activamos — dispara descarga nativa
    const a = document.createElement('a');
    a.href     = dlUrl;
    a.download = title.replace(/[^\w\- ]/g, '_').slice(0, 80) + '.mp4';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Cerramos el overlay después de un tiempo prudencial
    setTimeout(() => this.hideOverlay(), isTT ? 20000 : 12000);
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
