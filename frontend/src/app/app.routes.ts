import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '',         loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  { path: 'login',   loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register',loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'pricing', loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent) },
  { path: 'upgrade', loadComponent: () => import('./features/upgrade/upgrade.component').then(m => m.UpgradeComponent) },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'facebook',  loadComponent: () => import('./features/landing/facebook/landing-facebook.component').then(m => m.LandingFacebookComponent) },
  { path: 'instagram', loadComponent: () => import('./features/landing/instagram/landing-instagram.component').then(m => m.LandingInstagramComponent) },
  { path: 'tiktok',    loadComponent: () => import('./features/landing/tiktok/landing-tiktok.component').then(m => m.LandingTikTokComponent) },
  { path: 'login/oauth2/success', loadComponent: () => import('./features/auth/oauth-success/oauth-success.component').then(m => m.OAuthSuccessComponent) },
  { path: 'admin', loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },
  { path: '**', redirectTo: '' },
];
