import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'wssd-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `<div style="padding:40px;text-align:center;font-family:sans-serif;background:#e0e5ec;min-height:100vh"><h1>Dashboard</h1><p style="margin:16px 0">Página en construcción — Sprint 3</p><a routerLink="/" style="color:#1877f2">← Volver al inicio</a></div>`
})
export class DashboardComponent {}
