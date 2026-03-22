import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/authentication/authentication.service';

@Component({
  selector: 'wssd-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegisterComponent implements OnInit {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  name = ''; email = ''; password = ''; error = ''; loading = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'oauth_failed') {
        this.error = 'Error al registrarse con el proveedor social. Inténtalo de nuevo.';
      } else if (params['error'] === 'oauth_cancelled') {
        this.error = 'Registro cancelado.';
      }
    });
  }

  registerWithGoogle(): void {
    window.location.href = '/api/auth/oauth2/google/redirect';
  }

  register(): void {
    this.loading = true; this.error = '';
    this.auth.register(this.email, this.password, this.name).subscribe({
      next:  () => this.router.navigate(['/']),
      error: e  => { this.error = e.error?.error ?? 'Error al crear la cuenta'; this.loading = false; }
    });
  }
}
