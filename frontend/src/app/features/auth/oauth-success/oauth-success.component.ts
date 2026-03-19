import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'wssd-oauth-success',
  standalone: true,
  template: `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#e0e5ec;font-family:sans-serif;font-size:1.1rem;color:#718096">Iniciando sesión…</div>`
})
export class OAuthSuccessComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private auth   = inject(AuthService);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const access  = params['access'];
      const refresh = params['refresh'];
      if (access && refresh) {
        this.auth.storeSocialTokens(access, refresh);
        this.router.navigate(['/']);
      } else {
        this.router.navigate(['/login'], { queryParams: { error: 'oauth_failed' } });
      }
    });
  }
}
