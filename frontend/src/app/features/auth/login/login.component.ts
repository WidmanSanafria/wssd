import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
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
  `]
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  email = ''; password = ''; error = ''; loading = false;

  login(): void {
    this.loading = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next:  () => this.router.navigate(['/']),
      error: e  => { this.error = e.error?.error ?? 'Credenciales inválidas'; this.loading = false; }
    });
  }
}
