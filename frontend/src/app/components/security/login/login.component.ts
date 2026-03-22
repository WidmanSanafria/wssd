import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/authentication/authentication.service';

@Component({
  selector: 'wssd-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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
