import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'wssd-landing-youtube',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './landing-youtube.component.html',
  styleUrl: './landing-youtube.component.css'
})
export class LandingYouTubeComponent implements OnInit {
  private meta   = inject(Meta);
  private title  = inject(Title);
  private router = inject(Router);
  url = '';

  ngOnInit(): void {
    this.title.setTitle('Descargar Videos de YouTube Gratis 2026 | WSSD');
    this.meta.updateTag({ name: 'description', content: 'Descarga videos de YouTube gratis en HD. Sin instalar nada. WSSD — WS Social Downloader.' });
  }

  go(): void {
    if (this.url.trim()) this.router.navigate(['/'], { queryParams: { url: this.url.trim() } });
  }
}
