import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/authentication/authentication.service';

@Component({
  selector: 'wssd-oauth-success',
  standalone: true,
  templateUrl: './oauth-success.component.html',
  styleUrl: './oauth-success.component.css'
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
