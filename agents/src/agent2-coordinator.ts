/**
 * AGENTE 2 — Design & Dev Coordinator
 *
 * Recibe el brief del Agente 1 y produce:
 *   1. Componente Angular 21 listo para copiar al proyecto
 *   2. GitHub issue en Markdown listo para crear
 *
 * Uso: npx tsx src/agent2-coordinator.ts output/briefs/brief-facebook-xxx.json
 */
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import type { MarketingBrief, ComponentSpec, Platform } from './types.js';

const client = new Anthropic();

const PLATFORM_COMPONENT: Record<Platform, { name: string; selector: string; path: string }> = {
  facebook:  { name: 'LandingFacebookComponent',  selector: 'wssd-landing-facebook',  path: 'src/app/features/landing/facebook/landing-facebook.component.ts' },
  instagram: { name: 'LandingInstagramComponent', selector: 'wssd-landing-instagram', path: 'src/app/features/landing/instagram/landing-instagram.component.ts' },
  tiktok:    { name: 'LandingTiktokComponent',    selector: 'wssd-landing-tiktok',    path: 'src/app/features/landing/tiktok/landing-tiktok.component.ts' },
};

export async function runCoordinator(brief: MarketingBrief): Promise<ComponentSpec> {
  console.log(`\n🔧 Agente 2 — Coordinator iniciando para: ${brief.platform.toUpperCase()}\n`);

  const compMeta = PLATFORM_COMPONENT[brief.platform as Platform];

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: `Eres el coordinador de Diseño y Desarrollo de WSSD. Conviertes briefs de marketing en componentes Angular 21 listos para producción.

BRIEF DE MARKETING:
${JSON.stringify(brief, null, 2)}

STACK TÉCNICO:
- Angular 21, standalone components, signals, inject()
- Neomorphism design: --bg: #e0e5ec; shadows: 6px 6px 14px #a3b1c6, -6px -6px 14px #ffffff
- El componente debe usar toda la copy del brief (hero, features, how-it-works, FAQ, CTA)
- Buscador integrado que haga navigate a la home con el URL prellenado

COMPONENTE A GENERAR:
- Nombre: ${compMeta.name}
- Selector: ${compMeta.selector}
- Path: ${compMeta.path}

GENERA UN JSON con esta estructura exacta (sin markdown, sin explicaciones adicionales):
{
  "componentName": "${compMeta.name}",
  "filePath": "${compMeta.path}",
  "selector": "${compMeta.selector}",
  "title": "<título SEO de la página>",
  "metaTags": {
    "description": "...",
    "keywords": "...",
    "og:title": "...",
    "og:description": "...",
    "og:type": "website"
  },
  "schemaOrgJson": {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "WSSD",
    "description": "...",
    "url": "https://wssd.app",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web"
  },
  "angularTemplate": "<template HTML completo con ngIf, copy del brief integrado, neomorphism CSS classes, sección hero con input de URL, sección features, how-it-works, FAQ accordion, CTA button>",
  "angularStyles": "/* CSS completo neomorphism */",
  "githubIssue": {
    "title": "feat: landing page ${brief.platform}",
    "body": "## Descripción\\n...\\n## Screenshots\\n(pendiente)\\n## Notas técnicas\\n...",
    "labels": ["feature", "seo", "frontend"],
    "acceptanceCriteria": ["...", "..."]
  }
}

IMPORTANTE: el angularTemplate debe incluir TODO el contenido del brief renderizado (no placeholders).`,
    },
  ];

  let spec: ComponentSpec | null = null;
  let attempts = 0;

  while (!spec && attempts < 3) {
    attempts++;
    console.log(`  Intento ${attempts}/3...`);

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8096,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/s);

    if (jsonMatch) {
      try {
        spec = JSON.parse(jsonMatch[1]) as ComponentSpec;
        console.log(`  ✅ ComponentSpec generado (intento ${attempts})`);
      } catch {
        console.log(`  ⚠️ JSON inválido, reintentando...`);
        messages.push({ role: 'assistant', content: text });
        messages.push({
          role: 'user',
          content: 'JSON inválido. Responde ÚNICAMENTE con el objeto JSON válido.',
        });
      }
    } else {
      messages.push({ role: 'assistant', content: text });
      messages.push({ role: 'user', content: 'No encontré JSON. Responde solo con el objeto JSON comenzando con {.' });
    }
  }

  if (!spec) throw new Error('No se pudo generar el ComponentSpec');

  mkdirSync('output/components', { recursive: true });
  mkdirSync('output/issues', { recursive: true });

  // ── 1. Generar el archivo TypeScript del componente Angular
  const componentTs = `import { Component, OnInit, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: '${spec.selector}',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: \`${spec.angularTemplate.replace(/`/g, '\\`')}\`,
  styles: [\`${spec.angularStyles}\`]
})
export class ${spec.componentName} implements OnInit {
  private meta     = inject(Meta);
  private titleSvc = inject(Title);
  private router   = inject(Router);
  private doc      = inject(DOCUMENT);

  url = signal('');
  isLoading = signal(false);

  ngOnInit(): void {
    this.titleSvc.setTitle('${spec.title}');
    const tags = ${JSON.stringify(spec.metaTags, null, 4)};
    Object.entries(tags).forEach(([name, content]) => {
      this.meta.updateTag({ name, content: content as string });
    });

    // Inject Schema.org JSON-LD
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.text = \`${JSON.stringify(spec.schemaOrgJson)}\`;
    this.doc.head.appendChild(script);
  }

  search(): void {
    const u = this.url().trim();
    if (!u) return;
    this.router.navigate(['/'], { queryParams: { url: u } });
  }
}
`;

  const componentPath = `output/components/${spec.componentName}.ts`;
  writeFileSync(componentPath, componentTs, 'utf-8');

  // ── 2. Generar el GitHub issue en Markdown
  const issueMarkdown = `# ${spec.githubIssue.title}

${spec.githubIssue.body}

## Acceptance Criteria
${spec.githubIssue.acceptanceCriteria.map(c => `- [ ] ${c}`).join('\n')}

## Labels
\`${spec.githubIssue.labels.join('`  `')}\`

## Archivos a crear/modificar
- \`${spec.filePath}\`
- \`src/app/app.routes.ts\` — agregar ruta /${brief.platform}
`;
  const issuePath = `output/issues/issue-${brief.platform}.md`;
  writeFileSync(issuePath, issueMarkdown, 'utf-8');

  console.log(`  📦 Componente guardado: ${componentPath}`);
  console.log(`  📋 Issue guardado:      ${issuePath}`);

  return spec;
}

// ── Ejecución standalone ──────────────────────────────────
const briefFile = process.argv[2];
if (!briefFile) {
  console.error('Uso: npx tsx src/agent2-coordinator.ts <path/to/brief.json>');
  console.error('O usa run-all.ts para el pipeline completo');
  process.exit(1);
}

const brief = JSON.parse(readFileSync(briefFile, 'utf-8')) as MarketingBrief;
runCoordinator(brief)
  .then(() => console.log('\n✅ Coordinador completado'))
  .catch(err => { console.error('❌ Error:', err); process.exit(1); });
