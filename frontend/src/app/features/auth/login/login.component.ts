import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'wssd-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="auth-page">
  <div class="auth-card neo">
    <h1>Iniciar sesión</h1>
    <p>Descargas ilimitadas y sin anuncios</p>
    @if (error) { <div class="error">{{ error }}</div> }

    <!-- Social login buttons -->
    <button class="btn-social btn-google" (click)="loginWithGoogle()">
      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continuar con Google
    </button>
    <div class="divider"><span>o</span></div>

    <!-- Email/password form -->
    <input type="email" [(ngModel)]="email" placeholder="Email" class="neo-inset" />
    <input type="password" [(ngModel)]="password" placeholder="Contraseña" class="neo-inset" />
    <button class="btn-primary" (click)="login()" [disabled]="loading">
      {{ loading ? 'Entrando…' : 'Entrar' }}
    </button>
    <a routerLink="/register">¿No tienes cuenta? Regístrate gratis</a>
  </div>
</div>`,
  styles: [`
    :host { --bg:#e0e5ec; --shadow-l:#ffffff; --shadow-d:#a3b1c6; display:block; background:var(--bg); min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif; }
    .neo { background:var(--bg); border-radius:18px; box-shadow:6px 6px 14px var(--shadow-d),-6px -6px 14px var(--shadow-l); }
    .neo-inset { background:var(--bg); border-radius:12px; box-shadow:inset 4px 4px 10px var(--shadow-d),inset -4px -4px 10px var(--shadow-l); }
    .auth-card { padding:40px; width:380px; display:flex; flex-direction:column; gap:16px; }
    h1 { font-size:1.5rem; font-weight:900; }
    input { border:none; padding:14px 16px; font-size:1rem; outline:none; }
    .btn-primary { padding:14px; border:none; background:linear-gradient(135deg,#1877f2,#833ab4); color:#fff; border-radius:12px; font-weight:700; cursor:pointer; }
    .error { color:#c53030; font-size:.85rem; }
    a { color:#718096; font-size:.85rem; text-align:center; }
    .btn-social { display:flex; align-items:center; justify-content:center; gap:10px; padding:12px 14px; border:none; border-radius:12px; font-size:.95rem; font-weight:600; cursor:pointer; box-shadow:4px 4px 10px var(--shadow-d),-4px -4px 10px var(--shadow-l); transition:box-shadow .15s; }
    .btn-social:hover { box-shadow:2px 2px 6px var(--shadow-d),-2px -2px 6px var(--shadow-l); }
    .btn-google { background:#fff; color:#3c4043; }
    .divider { display:flex; align-items:center; gap:12px; color:#a0aec0; font-size:.85rem; }
    .divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--shadow-d); }
  `]
})
export class LoginComponent implements OnInit {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  email = ''; password = ''; error = ''; loading = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'oauth_failed') {
        this.error = 'Error al iniciar sesión con el proveedor social. Inténtalo de nuevo.';
      } else if (params['error'] === 'oauth_cancelled') {
        this.error = 'Inicio de sesión cancelado.';
      }
    });
  }

  loginWithGoogle(): void {
    window.location.href = '/api/auth/oauth2/google/redirect';
  }

  login(): void {
    this.loading = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next:  () => this.router.navigate(['/']),
      error: e  => { this.error = e.error?.error ?? 'Credenciales inválidas'; this.loading = false; }
    });
  }
}
