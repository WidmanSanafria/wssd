import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'wssd-landing-facebook',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './landing-facebook.component.html',
  styleUrl: './landing-facebook.component.css'
})
export class LandingFacebookComponent implements OnInit {
  private meta   = inject(Meta);
  private title  = inject(Title);
  private router = inject(Router);
  url = '';

  ngOnInit(): void {
    this.title.setTitle('Descargar Videos de Facebook Gratis 2026 | WSSD');
    this.meta.updateTag({ name: 'description', content: 'Descarga videos de Facebook gratis en HD. Sin instalar nada. WSSD — WS Social Downloader.' });
  }

  go(): void {
    if (this.url.trim()) this.router.navigate(['/'], { queryParams: { url: this.url.trim() } });
  }
}
