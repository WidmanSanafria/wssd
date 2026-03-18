import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private auth       = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.route.queryParams.subscribe(params => {
      const socialToken  = params['socialToken'];
      const refreshToken = params['refreshToken'];
      if (socialToken && refreshToken) {
        this.auth.storeSocialTokens(socialToken, refreshToken);
        this.router.navigate(['/'], { replaceUrl: true });
      }
    });
  }
}
