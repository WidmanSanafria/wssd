import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  originalPrice: number;
  badge?: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

@Component({
  selector: 'wssd-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<!-- Mini header -->
<header class="mini-header">
  <div class="mini-header-inner">
    <a routerLink="/" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      Inicio
    </a>
    <a routerLink="/" class="logo-pill">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      <span>WSSD</span>
    </a>
    <div class="mini-spacer"></div>
  </div>
</header>

<!-- Urgency banner -->
<div class="urgency-banner">
  🔥 <strong>OFERTA LIMITADA</strong> — 40% OFF el primer mes. Código: <code>WSSD40</code>
</div>

<!-- Main -->
<main class="pricing-main">
  <div class="pricing-hero">
    <h1 class="pricing-title">Elige tu plan</h1>
    <p class="pricing-sub">Sin compromisos. Cancela cuando quieras.</p>

    <!-- Annual toggle -->
    <div class="toggle-wrap neo">
      <button class="toggle-btn" [class.active]="!annual()" (click)="annual.set(false)">Mensual</button>
      <button class="toggle-btn" [class.active]="annual()" (click)="annual.set(true)">
        Anual <span class="save-badge">2 meses gratis</span>
      </button>
    </div>
  </div>

  <!-- Plan cards -->
  <div class="plans-grid">
    @for (plan of plans; track plan.id) {
      <div class="plan-card neo" [class.popular]="plan.popular">
        @if (plan.badge) {
          <div class="plan-badge">{{ plan.badge }}</div>
        }
        <h2 class="plan-name">{{ plan.name }}</h2>

        <div class="plan-price">
          @if (plan.originalPrice > 0 && annual()) {
            <span class="price-original">{{ '$' + plan.originalPrice.toFixed(2) }}</span>
          }
          @if (plan.originalPrice > 0 && !annual()) {
            <span class="price-original">{{ '$' + (plan.originalPrice + 5).toFixed(2) }}</span>
          }
          <span class="price-amount">
            @if (plan.monthlyPrice === 0) {
              Gratis
            } @else {
              {{ '$' + (annual() ? plan.annualPrice : plan.monthlyPrice).toFixed(2) }}<span class="price-period">/mes</span>
            }
          </span>
        </div>

        @if (annual() && plan.monthlyPrice > 0) {
          <p class="billed-note">Facturado anualmente ({{ '$' + (plan.annualPrice * 12).toFixed(2) }}/año)</p>
        }

        <ul class="features-list">
          @for (f of plan.features; track f) {
            <li>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="check-icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              {{ f }}
            </li>
          }
        </ul>

        @if (plan.id === 'free') {
          <a routerLink="/register" class="plan-cta cta-free">{{ plan.cta }}</a>
        } @else {
          <button class="plan-cta" [class.cta-pro]="plan.id === 'pro'" [class.cta-ent]="plan.id === 'enterprise'"
                  (click)="startCheckout(plan.id)" [disabled]="checkoutLoading()">
            @if (checkoutLoading()) { Redirigiendo… } @else { {{ plan.cta }} }
          </button>
        }
      </div>
    }
  </div>

  <!-- Feature comparison table -->
  <section class="comparison-section">
    <h2 class="section-title">Comparativa completa</h2>
    <div class="table-wrap neo">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Característica</th>
            <th>Free</th>
            <th class="th-pro">Pro</th>
            <th>Enterprise</th>
          </tr>
        </thead>
        <tbody>
          @for (row of comparisonRows; track row.feature) {
            <tr>
              <td>{{ row.feature }}</td>
              <td [innerHTML]="row.free"></td>
              <td class="td-pro" [innerHTML]="row.pro"></td>
              <td [innerHTML]="row.enterprise"></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq-section">
    <h2 class="section-title">Preguntas frecuentes</h2>
    <div class="faq-list">
      @for (item of faqItems; track item.q; let i = $index) {
        <div class="faq-item neo">
          <button class="faq-question" (click)="toggleFaq(i)" [attr.aria-expanded]="openFaq() === i">
            {{ item.q }}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="faq-icon"
                 [style.transform]="openFaq() === i ? 'rotate(180deg)' : 'rotate(0deg)'">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
          @if (openFaq() === i) {
            <p class="faq-answer">{{ item.a }}</p>
          }
        </div>
      }
    </div>
  </section>

  <!-- Footer CTA -->
  <section class="footer-cta neo">
    <h2>¿Listo para descargar sin límites?</h2>
    <p>Únete a +12,400 usuarios que ya disfrutan de Pro.</p>
    <button class="plan-cta cta-pro footer-cta-btn" (click)="startCheckout('pro')" [disabled]="checkoutLoading()">
      Empezar Pro — $7.99/mes
    </button>
  </section>
</main>

<footer class="pricing-footer">
  <p>© 2026 WSSD · <a routerLink="/">Inicio</a> · <a routerLink="/pricing">Precios</a></p>
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
      --accent: #5a67d8;
      display: block;
      background: var(--bg);
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
    }
    .neo { background: var(--card); border-radius: var(--radius); box-shadow: 6px 6px 14px var(--shadow-d), -6px -6px 14px var(--shadow-l); }
    .neo-inset { background: var(--card); border-radius: var(--radius); box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); }

    /* Mini header */
    .mini-header { background: var(--bg); padding: 0 24px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px var(--shadow-d); }
    .mini-header-inner { max-width: 960px; margin: 0 auto; display: flex; align-items: center; height: 54px; gap: 16px; }
    .back-link { display: flex; align-items: center; gap: 6px; font-size: .85rem; font-weight: 600; color: var(--muted); text-decoration: none; padding: 6px 12px; border-radius: 20px; box-shadow: 3px 3px 7px var(--shadow-d), -2px -2px 5px var(--shadow-l); }
    .logo-pill { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)); border-radius: 30px; padding: 5px 14px; text-decoration: none; font-weight: 800; color: #fff; font-size: .95rem; box-shadow: 3px 3px 8px var(--shadow-d); }
    .mini-spacer { flex: 1; }

    /* Urgency banner */
    .urgency-banner { background: linear-gradient(135deg, #e1306c, #833ab4); color: #fff; text-align: center; padding: 10px 16px; font-size: .88rem; letter-spacing: .3px; }
    .urgency-banner code { background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 6px; font-size: .85rem; letter-spacing: 1px; margin-left: 4px; }

    /* Main layout */
    .pricing-main { max-width: 960px; margin: 0 auto; padding: 48px 24px 80px; }
    .pricing-hero { text-align: center; margin-bottom: 40px; }
    .pricing-title { font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; letter-spacing: -1px; background: linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
    .pricing-sub { color: var(--muted); font-size: 1rem; margin-bottom: 28px; }

    /* Toggle */
    .toggle-wrap { display: inline-flex; padding: 5px; border-radius: 40px; gap: 4px; }
    .toggle-btn { padding: 8px 20px; border: none; border-radius: 30px; background: transparent; font-size: .9rem; font-weight: 600; color: var(--muted); cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 8px; }
    .toggle-btn.active { background: linear-gradient(135deg, var(--fb), var(--ig-a)); color: #fff; box-shadow: 3px 3px 8px var(--shadow-d); }
    .save-badge { background: #38a169; color: #fff; font-size: .72rem; padding: 2px 8px; border-radius: 10px; font-weight: 700; }

    /* Plans grid */
    .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 60px; align-items: start; }
    .plan-card { padding: 32px 28px; position: relative; display: flex; flex-direction: column; gap: 16px; transition: transform .2s; }
    .plan-card:hover { transform: translateY(-4px); }
    .plan-card.popular { box-shadow: 8px 8px 20px var(--shadow-d), -8px -8px 20px var(--shadow-l); border: 2px solid transparent; background: linear-gradient(var(--bg), var(--bg)) padding-box, linear-gradient(135deg, var(--fb), var(--ig-a), var(--ig-b)) border-box; }
    .plan-badge { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, var(--fb), var(--ig-a)); color: #fff; font-size: .75rem; font-weight: 700; padding: 4px 16px; border-radius: 20px; white-space: nowrap; box-shadow: 2px 2px 8px var(--shadow-d); }
    .plan-name { font-size: 1.3rem; font-weight: 800; color: var(--text); }
    .plan-price { display: flex; flex-direction: column; gap: 4px; }
    .price-original { font-size: 1rem; color: var(--muted); text-decoration: line-through; }
    .price-amount { font-size: 2.2rem; font-weight: 900; color: var(--text); line-height: 1; }
    .price-period { font-size: 1rem; font-weight: 400; color: var(--muted); }
    .billed-note { font-size: .78rem; color: var(--muted); }
    .features-list { list-style: none; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .features-list li { display: flex; align-items: flex-start; gap: 8px; font-size: .9rem; line-height: 1.4; }
    .check-icon { fill: #38a169; flex-shrink: 0; margin-top: 2px; }
    .plan-cta { padding: 14px; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; display: block; transition: opacity .2s, transform .15s; margin-top: auto; }
    .plan-cta:disabled { opacity: .6; cursor: not-allowed; }
    .plan-cta:not(:disabled):hover { transform: translateY(-2px); }
    .cta-free { background: var(--bg); color: var(--text); box-shadow: 3px 3px 8px var(--shadow-d), -3px -3px 8px var(--shadow-l); }
    .cta-pro { background: linear-gradient(135deg, var(--fb), var(--ig-a)); color: #fff; box-shadow: 3px 3px 10px var(--shadow-d); }
    .cta-ent { background: linear-gradient(135deg, var(--ig-a), var(--ig-b)); color: #fff; box-shadow: 3px 3px 10px var(--shadow-d); }

    /* Comparison table */
    .comparison-section { margin-bottom: 60px; }
    .section-title { font-size: 1.6rem; font-weight: 800; text-align: center; margin-bottom: 24px; }
    .table-wrap { overflow-x: auto; }
    .comparison-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    .comparison-table th, .comparison-table td { padding: 14px 18px; text-align: center; border-bottom: 1px solid rgba(163,177,198,.3); }
    .comparison-table th:first-child, .comparison-table td:first-child { text-align: left; font-weight: 600; }
    .comparison-table thead { background: rgba(163,177,198,.15); }
    .th-pro { background: linear-gradient(135deg, rgba(24,119,242,.1), rgba(131,58,180,.1)); font-weight: 800; }
    .td-pro { background: rgba(24,119,242,.05); font-weight: 600; }

    /* FAQ */
    .faq-section { margin-bottom: 60px; }
    .faq-list { display: flex; flex-direction: column; gap: 12px; }
    .faq-item { overflow: hidden; }
    .faq-question { width: 100%; padding: 18px 22px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 1rem; font-weight: 600; color: var(--text); text-align: left; gap: 12px; }
    .faq-icon { flex-shrink: 0; transition: transform .25s; color: var(--muted); }
    .faq-answer { padding: 0 22px 18px; font-size: .9rem; color: var(--muted); line-height: 1.6; }

    /* Footer CTA */
    .footer-cta { padding: 48px 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 40px; }
    .footer-cta h2 { font-size: 1.6rem; font-weight: 800; }
    .footer-cta p { color: var(--muted); }
    .footer-cta-btn { max-width: 300px; padding: 16px 32px; font-size: 1.05rem; }

    /* Page footer */
    .pricing-footer { text-align: center; padding: 24px; font-size: .8rem; color: var(--muted); }
    .pricing-footer a { color: var(--muted); text-decoration: none; margin: 0 4px; }

    /* Responsive */
    @media (max-width: 768px) {
      .plans-grid { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; }
      .plan-card.popular { order: -1; }
      .pricing-main { padding: 32px 16px 60px; }
    }
    @media (max-width: 480px) {
      .mini-header { padding: 0 14px; }
      .comparison-table th, .comparison-table td { padding: 10px 12px; font-size: .8rem; }
    }
  `]
})
export class PricingComponent implements OnInit {
  private auth   = inject(AuthService);
  private http   = inject(HttpClient);
  private router = inject(Router);

  annual          = signal(false);
  checkoutLoading = signal(false);
  openFaq         = signal<number | null>(null);

  plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      originalPrice: 0,
      features: [
        '5 descargas / mes',
        'Calidad SD',
        'Incluye anuncios',
        'Sin historial',
        'Soporte básico'
      ],
      cta: 'Empezar gratis'
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 7.99,
      annualPrice: 5.32,
      originalPrice: 12.99,
      badge: '⭐ Más popular',
      popular: true,
      features: [
        'Descargas ilimitadas',
        'Sin anuncios',
        'Calidad HD',
        'Historial 90 días',
        'Soporte prioritario'
      ],
      cta: 'Empezar Pro'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 19.99,
      annualPrice: 13.32,
      originalPrice: 29.99,
      features: [
        'Todo lo de Pro',
        'Acceso a API',
        'Multi-usuario (hasta 10)',
        'Historial ilimitado',
        'SLA 99.9%'
      ],
      cta: 'Empezar Enterprise'
    }
  ];

  comparisonRows = [
    { feature: 'Descargas / mes',     free: '5',        pro: 'Ilimitadas',   enterprise: 'Ilimitadas' },
    { feature: 'Calidad',             free: 'SD',        pro: 'HD',           enterprise: 'HD' },
    { feature: 'Anuncios',            free: '✓',         pro: '✗',            enterprise: '✗' },
    { feature: 'Historial',           free: '✗',         pro: '90 días',      enterprise: 'Ilimitado' },
    { feature: 'Soporte',             free: 'Básico',    pro: 'Prioritario',  enterprise: '24/7 dedicado' },
    { feature: 'Acceso API',          free: '✗',         pro: '✗',            enterprise: '✓' },
    { feature: 'Multi-usuario',       free: '✗',         pro: '✗',            enterprise: 'Hasta 10' },
    { feature: 'SLA',                 free: '✗',         pro: '✗',            enterprise: '99.9%' }
  ];

  faqItems = [
    {
      q: '¿Puedo cancelar en cualquier momento?',
      a: 'Sí, puedes cancelar tu suscripción cuando quieras desde tu panel de cuenta. No hay permanencia ni cargos adicionales.'
    },
    {
      q: '¿Qué plataformas están soportadas?',
      a: 'WSSD soporta Facebook, Instagram (incluyendo Reels y carousels) y TikTok. Estamos añadiendo más plataformas continuamente.'
    },
    {
      q: '¿Es seguro el pago?',
      a: 'Sí, todos los pagos se procesan a través de Stripe con encriptación SSL. Nunca almacenamos los datos de tu tarjeta.'
    },
    {
      q: '¿Existe garantía de reembolso?',
      a: 'Ofrecemos garantía de devolución de dinero de 30 días sin preguntas. Si no estás satisfecho, te reembolsamos completamente.'
    }
  ];

  ngOnInit(): void {}

  toggleFaq(i: number): void {
    this.openFaq.set(this.openFaq() === i ? null : i);
  }

  startCheckout(plan: string): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/register'], { queryParams: { next: 'pricing' } });
      return;
    }
    this.checkoutLoading.set(true);
    this.http.post<{ url: string }>('/api/billing/checkout', { plan }).subscribe({
      next:  res => { window.location.href = res.url; },
      error: (err) => {
        this.checkoutLoading.set(false);
        const msg = err?.error?.url?.startsWith('ERROR:')
          ? err.error.url.replace('ERROR: ', '')
          : 'Error al procesar el pago. Por favor intenta de nuevo.';
        alert('❌ ' + msg);
      }
    });
  }
}
