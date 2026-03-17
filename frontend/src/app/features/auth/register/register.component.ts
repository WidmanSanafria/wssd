import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'wssd-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="auth-page">
  <div class="auth-card neo">
    <h1>Crear cuenta gratis</h1>
    <p>10 descargas diarias gratis · Sin anuncios</p>
    @if (error) { <div class="error">{{ error }}</div> }
    <input type="text"     [(ngModel)]="name"     placeholder="Nombre" class="neo-inset" />
    <input type="email"    [(ngModel)]="email"    placeholder="Email" class="neo-inset" />
    <input type="password" [(ngModel)]="password" placeholder="Contraseña (mín. 8 caracteres)" class="neo-inset" />
    <button class="btn-primary" (click)="register()" [disabled]="loading">
      {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
    </button>
    <a routerLink="/login">¿Ya tienes cuenta? Inicia sesión</a>
  </div>
</div>`,
  styles: [`
    :host { --bg:#e0e5ec; --shadow-l:#ffffff; --shadow-d:#a3b1c6; display:flex; align-items:center; justify-content:center; background:var(--bg); min-height:100vh; font-family:sans-serif; }
    .neo { background:var(--bg); border-radius:18px; box-shadow:6px 6px 14px var(--shadow-d),-6px -6px 14px var(--shadow-l); }
    .neo-inset { background:var(--bg); border-radius:12px; box-shadow:inset 4px 4px 10px var(--shadow-d),inset -4px -4px 10px var(--shadow-l); }
    .auth-card { padding:40px; width:400px; display:flex; flex-direction:column; gap:16px; }
    h1 { font-size:1.5rem; font-weight:900; }
    input { border:none; padding:14px 16px; font-size:1rem; outline:none; }
    .btn-primary { padding:14px; border:none; background:linear-gradient(135deg,#1877f2,#833ab4); color:#fff; border-radius:12px; font-weight:700; cursor:pointer; }
    .error { color:#c53030; font-size:.85rem; }
    a { color:#718096; font-size:.85rem; text-align:center; }
  `]
})
export class RegisterComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  name = ''; email = ''; password = ''; error = ''; loading = false;

  register(): void {
    this.loading = true; this.error = '';
    this.auth.register(this.email, this.password, this.name).subscribe({
      next:  () => this.router.navigate(['/']),
      error: e  => { this.error = e.error?.error ?? 'Error al crear la cuenta'; this.loading = false; }
    });
  }
}
