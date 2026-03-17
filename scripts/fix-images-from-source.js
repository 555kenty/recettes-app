// Corrige les images manquantes/incorrectes en re-fetchant l'og:image
// depuis la page source originale pour chaque recette importée via Gemini.
//
// Usage :
//   node scripts/fix-images-from-source.js --file=scripts/urls-750g-libanaise.txt
//   node scripts/fix-images-from-source.js --file=scripts/urls-750g-libanaise.txt --dry-run
//   node scripts/fix-images-from-source.js --all-gemini   → traite toutes les recettes gemini-scrape

require('dotenv/config');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
const allGemini = args.includes('--all-gemini');

const DELAY_MS = 600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Même formule que scrape-gemini.js ────────────────────────────────────────

function buildSourceId(url) {
  return `gemini_${Buffer.from(url).toString('base64').slice(0, 60)}`;
}

// ── Fetch og:image ────────────────────────────────────────────────────────────

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    // Lit les 30Ko du début du HTML (caribbeanpot.com a l'og:image plus loin)
    const reader = res.body.getReader();
    let html = '';
    while (html.length < 30000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
    }
    reader.cancel();

    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m?.[1]?.startsWith('http')) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Correction images depuis pages sources\n');
  if (isDryRun) console.log('   Mode DRY-RUN\n');

  let urls = [];

  if (fileArg) {
    if (!fs.existsSync(fileArg)) { console.error(`❌ Fichier introuvable : ${fileArg}`); process.exit(1); }
    urls = fs.readFileSync(fileArg, 'utf8')
      .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    console.log(`📋 ${urls.length} URL(s) depuis ${fileArg}\n`);
  } else if (allGemini) {
    // Reconstruit les URLs depuis les fichiers scripts/urls-*.txt
    const urlFiles = fs.readdirSync('scripts').filter(f => f.startsWith('urls-') && f.endsWith('.txt'));
    for (const f of urlFiles) {
      const lines = fs.readFileSync(`scripts/${f}`, 'utf8')
        .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      urls.push(...lines);
    }
    urls = [...new Set(urls)]; // déduplique
    console.log(`📋 ${urls.length} URL(s) au total (${urlFiles.length} fichiers)\n`);
  } else {
    console.error('Usage: --file=urls.txt OU --all-gemini');
    process.exit(1);
  }

  let updated = 0, skipped = 0, notFound = 0, failed = 0;

  for (const url of urls) {
    const sourceId = buildSourceId(url);
    const recipe = await prisma.recipe.findUnique({
      where: { sourceId },
      select: { id: true, title: true, imageUrl: true },
    });

    if (!recipe) {
      // Recette pas encore importée, on ignore
      skipped++;
      continue;
    }

    process.stdout.write(`🔍 "${recipe.title}" → `);

    const ogImage = await fetchOgImage(url);

    if (!ogImage) {
      console.log(`❌ Pas d'og:image`);
      notFound++;
      await sleep(DELAY_MS);
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY-RUN] ${ogImage}`);
      updated++;
    } else {
      await prisma.recipe.update({ where: { id: recipe.id }, data: { imageUrl: ogImage } });
      console.log(`✅ ${ogImage}`);
      updated++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📊 ✅ ${updated} mis à jour · ⏭️  ${skipped} non trouvés en DB · ❌ ${notFound} sans og:image · ${failed} erreurs`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
