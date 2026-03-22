import { Routes } from '@angular/router';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
  { path: '',         loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'login',   loadComponent: () => import('./components/security/login/login.component').then(m => m.LoginComponent) },
  { path: 'register',loadComponent: () => import('./components/security/registration/registration.component').then(m => m.RegisterComponent) },
  { path: 'pricing', loadComponent: () => import('./components/pricing/pricing.component').then(m => m.PricingComponent) },
  { path: 'upgrade', loadComponent: () => import('./components/upgrade/upgrade.component').then(m => m.UpgradeComponent) },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'facebook',  loadComponent: () => import('./components/landing/facebook/landing-facebook.component').then(m => m.LandingFacebookComponent) },
  { path: 'instagram', loadComponent: () => import('./components/landing/instagram/landing-instagram.component').then(m => m.LandingInstagramComponent) },
  { path: 'tiktok',    loadComponent: () => import('./components/landing/tiktok/landing-tiktok.component').then(m => m.LandingTikTokComponent) },
  { path: 'login/oauth2/success', loadComponent: () => import('./components/security/oauth-success/oauth-success.component').then(m => m.OAuthSuccessComponent) },
  { path: 'admin', loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent) },
  { path: '**', redirectTo: '' },
];
