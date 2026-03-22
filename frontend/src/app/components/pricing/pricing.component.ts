import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/authentication/authentication.service';
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
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
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
