/**
 * Pipeline completo: Agente 1 → Agente 2 para cada plataforma
 *
 * Uso:
 *   npx tsx src/run-all.ts              → las 3 plataformas
 *   npx tsx src/run-all.ts facebook     → solo Facebook
 */
import { runStrategist } from './agent1-strategist.js';
import { runCoordinator } from './agent2-coordinator.js';
import type { Platform } from './types.js';

const ALL_PLATFORMS: Platform[] = ['facebook', 'instagram', 'tiktok'];
const requested = process.argv[2] as Platform | undefined;
const platforms: Platform[] = requested ? [requested] : ALL_PLATFORMS;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      WSSD Marketing Pipeline — Agentes Claude            ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Plataformas: ${platforms.join(', ').padEnd(43)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const results: Array<{ platform: Platform; success: boolean; error?: string }> = [];

  for (const platform of platforms) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  🚀 Procesando: ${platform.toUpperCase()}`);
    console.log(`${'─'.repeat(60)}`);

    try {
      // Agente 1: genera el brief de marketing
      const brief = await runStrategist(platform);

      // Agente 2: convierte el brief en componente Angular + issue
      await runCoordinator(brief);

      results.push({ platform, success: true });
      console.log(`\n  ✅ ${platform.toUpperCase()} completado\n`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`\n  ❌ Error en ${platform}: ${msg}\n`);
      results.push({ platform, success: false, error: msg });
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTADOS FINALES                    ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    console.log(`║  ${icon} ${r.platform.padEnd(12)} ${r.success ? 'OK' : r.error?.substring(0, 40) ?? 'Error'}`);
  }
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n📁 Salida en: agents/output/');
  console.log('   briefs/     — JSON con el brief de cada plataforma');
  console.log('   components/ — Componentes Angular listos para copiar');
  console.log('   issues/     — GitHub issues en Markdown\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
