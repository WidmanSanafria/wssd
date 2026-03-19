import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'wssd-upgrade',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="upgrade-page">

  <!-- Social proof bar -->
  <div class="social-proof-bar">
    🎉 <strong>+12,400 usuarios</strong> ya descargando sin límites
  </div>

  <main class="upgrade-main">

    <!-- Emotional hook -->
    <section class="hook-section">
      <div class="hook-emoji">😤</div>
      <h1 class="hook-title">5 descargas NO son suficientes, ¿verdad?</h1>
      <p class="hook-sub">Ya lo sabemos. Por eso creamos Pro — descargas ilimitadas, sin anuncios, HD puro.</p>
    </section>

    <!-- Urgency countdown -->
    <div class="countdown-wrap neo">
      <div class="countdown-label">⏰ Oferta expira en:</div>
      <div class="countdown-timer">
        <div class="time-block neo-inset">
          <span class="time-num">{{ hours() }}</span>
          <span class="time-unit">h</span>
        </div>
        <span class="time-sep">:</span>
        <div class="time-block neo-inset">
          <span class="time-num">{{ minutes() }}</span>
          <span class="time-unit">m</span>
        </div>
        <span class="time-sep">:</span>
        <div class="time-block neo-inset">
          <span class="time-num">{{ seconds() }}</span>
          <span class="time-unit">s</span>
        </div>
      </div>
      <p class="countdown-sub">Precio especial de lanzamiento — solo {{ annual ? '$5.32' : '$7.99' }}/mes</p>
    </div>

    <!-- Comparison Free vs Pro -->
    <section class="comparison-section">
      <h2 class="section-label">¿Qué cambia con Pro?</h2>
      <div class="compare-grid">
        <div class="compare-card free-card neo-inset">
          <div class="compare-header free-header">
            <span class="compare-icon">😞</span>
            <h3>Free (ahora)</h3>
          </div>
          <ul class="compare-list">
            <li class="con">Solo 5 descargas/mes</li>
            <li class="con">Anuncios en cada descarga</li>
            <li class="con">Solo calidad SD</li>
            <li class="con">Sin historial</li>
            <li class="con">Soporte básico</li>
          </ul>
        </div>

        <div class="compare-arrow">→</div>

        <div class="compare-card pro-card neo">
          <div class="compare-header pro-header">
            <span class="compare-icon">🚀</span>
            <h3>Pro</h3>
          </div>
          <ul class="compare-list">
            <li class="pro">Descargas ILIMITADAS</li>
            <li class="pro">Cero anuncios</li>
            <li class="pro">HD + 4K calidad</li>
            <li class="pro">Historial 90 días</li>
            <li class="pro">Soporte prioritario</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Main CTA -->
    <section class="cta-section">
      <div class="price-display neo">
        <span class="old-price">$12.99</span>
        <span class="new-price">$7.99</span>
        <span class="per-month">/mes</span>
        <span class="discount-tag">-38% OFF</span>
      </div>

      <button class="main-cta-btn" (click)="startCheckout()" [disabled]="loading()">
        @if (loading()) {
          <span class="btn-spinner"></span> Redirigiendo…
        } @else {
          🚀 Obtener Pro — Solo $7.99/mes
        }
      </button>

      <div class="guarantee-badge neo">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" class="shield-icon">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <span>30 días de garantía sin riesgo · Reembolso completo si no estás satisfecho</span>
      </div>
    </section>

    <!-- Trust badges -->
    <section class="trust-section">
      <div class="trust-badge neo">
        <div class="trust-icon">🔒</div>
        <div>
          <strong>Pago seguro</strong>
          <p>Procesado por Stripe con SSL</p>
        </div>
      </div>
      <div class="trust-badge neo">
        <div class="trust-icon">🚫</div>
        <div>
          <strong>Sin anuncios</strong>
          <p>Experiencia 100% limpia</p>
        </div>
      </div>
      <div class="trust-badge neo">
        <div class="trust-icon">✋</div>
        <div>
          <strong>Cancela cuando quieras</strong>
          <p>Sin permanencia ni sorpresas</p>
        </div>
      </div>
    </section>

    <!-- Secondary links -->
    <p class="secondary-links">
      <a routerLink="/pricing">Ver todos los planes</a> ·
      <a routerLink="/">Volver al inicio</a>
    </p>

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
      display: block;
      background: var(--bg);
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
    }
    .neo       { background: var(--card); border-radius: var(--radius); box-shadow: 6px 6px 14px var(--shadow-d), -6px -6px 14px var(--shadow-l); }
    .neo-inset { background: var(--card); border-radius: var(--radius); box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); }

    .upgrade-page { min-height: 100vh; }

    .social-proof-bar { background: linear-gradient(135deg, #38a169, #2f855a); color: #fff; text-align: center; padding: 10px 16px; font-size: .88rem; }

    .upgrade-main { max-width: 680px; margin: 0 auto; padding: 40px 20px 80px; display: flex; flex-direction: column; gap: 40px; align-items: center; }

    /* Hook */
    .hook-section { text-align: center; }
    .hook-emoji { font-size: 3.5rem; margin-bottom: 12px; }
    .hook-title { font-size: clamp(1.6rem, 5vw, 2.4rem); font-weight: 900; letter-spacing: -0.5px; background: linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 12px; line-height: 1.2; }
    .hook-sub { font-size: 1rem; color: var(--muted); line-height: 1.6; max-width: 480px; }

    /* Countdown */
    .countdown-wrap { padding: 24px 32px; text-align: center; width: 100%; }
    .countdown-label { font-size: .85rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
    .countdown-timer { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
    .time-block { display: flex; align-items: baseline; gap: 2px; padding: 10px 18px; }
    .time-num { font-size: 2rem; font-weight: 900; color: var(--text); line-height: 1; }
    .time-unit { font-size: .9rem; color: var(--muted); font-weight: 600; }
    .time-sep { font-size: 1.8rem; font-weight: 900; color: var(--ig-a); }
    .countdown-sub { font-size: .85rem; color: var(--muted); }

    /* Comparison */
    .comparison-section { width: 100%; }
    .section-label { font-size: 1.2rem; font-weight: 800; text-align: center; margin-bottom: 20px; }
    .compare-grid { display: flex; align-items: center; gap: 12px; }
    .compare-card { flex: 1; padding: 24px 20px; }
    .compare-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .compare-icon { font-size: 1.5rem; }
    .compare-header h3 { font-size: 1.1rem; font-weight: 800; }
    .pro-header h3 { background: linear-gradient(135deg, var(--fb), var(--ig-a)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .pro-card { border: 2px solid transparent; background: linear-gradient(var(--bg), var(--bg)) padding-box, linear-gradient(135deg, var(--fb), var(--ig-a)) border-box; }
    .compare-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .compare-list li { font-size: .88rem; padding-left: 20px; position: relative; line-height: 1.4; }
    .compare-list li.con::before { content: '✗'; position: absolute; left: 0; color: #e53e3e; font-weight: 700; }
    .compare-list li.pro::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700; }
    .compare-arrow { font-size: 2rem; color: var(--ig-a); font-weight: 900; flex-shrink: 0; }

    /* CTA section */
    .cta-section { width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .price-display { display: flex; align-items: baseline; gap: 8px; padding: 16px 28px; justify-content: center; }
    .old-price { font-size: 1.2rem; color: var(--muted); text-decoration: line-through; }
    .new-price { font-size: 2.8rem; font-weight: 900; color: var(--text); }
    .per-month { font-size: 1rem; color: var(--muted); }
    .discount-tag { background: #e53e3e; color: #fff; font-size: .75rem; font-weight: 700; padding: 3px 10px; border-radius: 10px; }
    .main-cta-btn { width: 100%; max-width: 420px; padding: 18px 32px; font-size: 1.1rem; font-weight: 800; border: none; border-radius: 16px; background: linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)); color: #fff; cursor: pointer; box-shadow: 4px 4px 14px var(--shadow-d); transition: transform .2s, box-shadow .2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .main-cta-btn:not(:disabled):hover { transform: translateY(-3px); box-shadow: 6px 6px 18px var(--shadow-d); }
    .main-cta-btn:disabled { opacity: .7; cursor: not-allowed; }
    .btn-spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .guarantee-badge { display: flex; align-items: center; gap: 10px; padding: 14px 20px; font-size: .85rem; color: var(--muted); text-align: left; max-width: 420px; }
    .shield-icon { fill: var(--green); flex-shrink: 0; }

    /* Trust badges */
    .trust-section { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .trust-badge { padding: 20px 16px; display: flex; gap: 12px; align-items: flex-start; }
    .trust-icon { font-size: 1.5rem; flex-shrink: 0; }
    .trust-badge strong { font-size: .9rem; display: block; margin-bottom: 4px; }
    .trust-badge p { font-size: .8rem; color: var(--muted); }

    /* Secondary links */
    .secondary-links { font-size: .85rem; color: var(--muted); text-align: center; }
    .secondary-links a { color: var(--muted); text-decoration: underline; margin: 0 4px; }

    @media (max-width: 600px) {
      .upgrade-main { padding: 28px 16px 60px; gap: 28px; }
      .compare-grid { flex-direction: column; }
      .compare-arrow { transform: rotate(90deg); }
      .trust-section { grid-template-columns: 1fr; }
      .countdown-wrap { padding: 20px 16px; }
      .time-num { font-size: 1.6rem; }
      .price-display { flex-wrap: wrap; }
    }
  `]
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
      error: ()  => { this.loading.set(false); }
    });
  }
}
