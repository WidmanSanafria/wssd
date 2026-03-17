/**
 * AGENTE 1 — Marketing Strategist
 *
 * Recibe una plataforma (facebook | instagram | tiktok) y genera un
 * marketing brief completo en JSON: keywords, copy, blog posts y SEO meta.
 *
 * Uso: npx tsx src/agent1-strategist.ts facebook
 */
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'fs';
import type { MarketingBrief, Platform } from './types.js';

const client = new Anthropic();

const PLATFORM_CONTEXT: Record<Platform, string> = {
  facebook: 'videos de Facebook, Reels de Facebook, videos de grupos privados, posts con video, Facebook Watch',
  instagram: 'Reels de Instagram, fotos de Instagram, carousels de Instagram, Stories de Instagram, videos de IGTV',
  tiktok:   'videos de TikTok sin marca de agua, descargar TikTok en MP4, bajar TikTok sin watermark',
};

export async function runStrategist(platform: Platform): Promise<MarketingBrief> {
  console.log(`\n🎯 Agente 1 — Strategist iniciando para: ${platform.toUpperCase()}\n`);

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: `Eres el Director de Marketing de WSSD (WS Social Downloader), herramienta web SaaS gratuita para descargar videos de redes sociales. Target principal: usuarios de habla hispana (España, México, Argentina, Colombia).

Crea un marketing brief COMPLETO Y DETALLADO en español para la landing page de ${platform.toUpperCase()}.

Contexto de la plataforma: ${PLATFORM_CONTEXT[platform]}

PROPUESTA DE VALOR DE WSSD:
- Gratis: primeras 5 descargas sin registro
- Sin instalar nada — funciona 100% en el navegador
- Compatible con Facebook, Instagram y TikTok
- Descarga en HD, Full HD, audio MP3
- Descarga carousels e imágenes completos

Genera el brief con:
1. Top 15 keywords en español (con volumen mensual estimado y dificultad low/medium/high)
2. Audiencia objetivo detallada
3. Hero headline (máx 8 palabras, impactante, en español)
4. Hero subheadline (máx 20 palabras)
5. 6 value propositions únicas y convincentes
6. 4 variantes de CTA (botones de llamada a la acción)
7. Copy completo de landing page:
   - heroSection: párrafo de presentación
   - featuresSection: 6 características con descripción
   - howItWorksSteps: 3 pasos simples
   - faqItems: 5 preguntas frecuentes con respuestas
   - footerTagline: frase corta memorable
8. 3 ideas de blog posts (título, slug, metaDescription, keyword objetivo, outline de 5 puntos, wordCount estimado)
9. SEO meta completo (title, description, canonicalPath, ogTitle, ogDescription)

RESPONDE ÚNICAMENTE CON JSON VÁLIDO (sin markdown, sin explicaciones) siguiendo exactamente esta interfaz TypeScript:

interface MarketingBrief {
  platform: string;
  targetAudience: string;
  keywords: Array<{ keyword: string; estimatedMonthlySearches: string; difficulty: 'low'|'medium'|'high'; intent: string; languageVariants?: string[] }>;
  heroHeadline: string;
  heroSubheadline: string;
  valueProps: string[];
  ctaVariants: string[];
  landingPageCopy: {
    heroSection: string;
    featuresSection: string[];
    howItWorksSteps: string[];
    faqItems: Array<{ question: string; answer: string }>;
    footerTagline: string;
  };
  blogPosts: Array<{ title: string; slug: string; metaDescription: string; targetKeyword: string; outline: string[]; estimatedWordCount: number }>;
  seoMeta: { title: string; description: string; canonicalPath: string; ogTitle: string; ogDescription: string };
}`,
    },
  ];

  let brief: MarketingBrief | null = null;
  let attempts = 0;

  // Agentic loop: reintenta hasta obtener JSON válido
  while (!brief && attempts < 3) {
    attempts++;
    console.log(`  Intento ${attempts}/3...`);

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8096,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extrae JSON (maneja bloques ```json ... ```)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);

    if (jsonMatch) {
      try {
        brief = JSON.parse(jsonMatch[1]) as MarketingBrief;
        console.log(`  ✅ Brief generado (intento ${attempts})`);
      } catch {
        console.log(`  ⚠️ JSON inválido, reintentando...`);
        messages.push({ role: 'assistant', content: text });
        messages.push({
          role: 'user',
          content: 'El JSON no es válido. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin bloques markdown.',
        });
      }
    } else {
      console.log(`  ⚠️ No se encontró JSON en la respuesta, reintentando...`);
      messages.push({ role: 'assistant', content: text });
      messages.push({
        role: 'user',
        content: 'No encontré JSON en tu respuesta. Responde ÚNICAMENTE con el objeto JSON, empezando con { y terminando con }.',
      });
    }
  }

  if (!brief) throw new Error('No se pudo generar el brief después de 3 intentos');

  // Guardar brief en archivo
  mkdirSync('output/briefs', { recursive: true });
  const outputPath = `output/briefs/brief-${platform}-${Date.now()}.json`;
  writeFileSync(outputPath, JSON.stringify(brief, null, 2), 'utf-8');
  console.log(`  📄 Brief guardado: ${outputPath}`);

  return brief;
}

// ── Ejecución standalone ──────────────────────────────────
const platform = (process.argv[2] ?? 'facebook') as Platform;
if (!['facebook', 'instagram', 'tiktok'].includes(platform)) {
  console.error('Uso: npx tsx src/agent1-strategist.ts [facebook|instagram|tiktok]');
  process.exit(1);
}

runStrategist(platform)
  .then(brief => {
    console.log('\n📊 RESUMEN:');
    console.log(`  Plataforma:  ${brief.platform}`);
    console.log(`  Keywords:    ${brief.keywords.length}`);
    console.log(`  Hero:        "${brief.heroHeadline}"`);
    console.log(`  Blog posts:  ${brief.blogPosts.length}`);
    console.log(`  CTA:         ${brief.ctaVariants.join(' | ')}`);
  })
  .catch(err => { console.error('❌ Error:', err); process.exit(1); });
