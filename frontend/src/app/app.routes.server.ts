import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Home and dynamic routes use SSR (server-rendered on each request)
  // to avoid issues with browser APIs (fetch, document, localStorage)
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Server
  },
  // Static landing pages can be prerendered
  {
    path: 'facebook',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'instagram',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'tiktok',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'pricing',
    renderMode: RenderMode.Prerender
  },
  // OAuth callback — MUST be client-only: tokens are saved to localStorage
  // which doesn't exist on the server. SSR here means tokens are never saved.
  {
    path: 'login/oauth2/success',
    renderMode: RenderMode.Client
  },
  // Everything else: SSR
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
