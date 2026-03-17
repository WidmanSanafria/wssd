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
  // Everything else: SSR
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
