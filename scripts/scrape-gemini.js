// Script de scraping universel via Gemini
// Fonctionne sur n'importe quel site de recettes (196flavors, 750g, caribbeanpot, etc.)
// Gemini lit le HTML et extrait les données — pas besoin de JSON-LD.
//
// Usage :
//   node scripts/scrape-gemini.js --url="https://www.196flavors.com/griot/"
//   node scripts/scrape-gemini.js --file=scripts/urls-haitienne.txt --cuisine="Haïtienne"
//   node scripts/scrape-gemini.js --file=scripts/urls-africaine.txt --dry-run

require('dotenv/config');
const fs = require('fs');
const OpenAI = require('openai').default;
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

const DELAY_MS = 2000;
const MAX_HTML_CHARS = 12000; // limite pour rester dans les tokens Gemini

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const urlArg = args.find((a) => a.startsWith('--url='))?.split('=').slice(1).join('=');
const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
const cuisineArg = args.find((a) => a.startsWith('--cuisine='))?.split('=').slice(1).join('=');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fetch HTML ────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Extrait l'og:image ou la première grande image de la page
function extractOgImage(html) {
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
}

// Extrait le texte lisible d'un HTML (supprime scripts, styles, balises)
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, '\n')
    .trim()
    .slice(0, MAX_HTML_CHARS);
}

// ── Extraction Gemini ─────────────────────────────────────────────────────────

const EXTRACT_PROMPT = `Tu es un extracteur de recettes. Analyse ce texte de page web et extrait la recette principale.
Réponds UNIQUEMENT avec du JSON valide, sans markdown ni explication.

Format attendu :
{
  "title": "string",
  "description": "string (1-3 phrases max)",
  "cuisineType": "string (pays ou région)",
  "category": "string (Entrée | Plat principal | Dessert | Boisson | Condiment)",
  "timeMinutes": number | null,
  "servings": number | null,
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}],
  "steps": [{"order": number, "description": "string"}],
  "tags": ["string"],
  "imageUrl": "string | null (URL absolue de l'image principale si visible dans le texte)"
}

Si une information n'est pas disponible, utilise null ou [].
Pour difficulty : Facile si < 30 min, Difficile si > 60 min ou technique complexe, sinon Moyen.`;

async function extractWithGemini(text, url) {
  const response = await gemini.chat.completions.create({
    model: 'models/gemini-2.5-flash',
    messages: [
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: `URL source: ${url}\n\n${text}` },
    ],
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  // Extrait le JSON même si Gemini ajoute du texte autour
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Pas de JSON dans la réponse Gemini');
  return JSON.parse(match[0]);
}

// ── Sauvegarde DB ─────────────────────────────────────────────────────────────

function buildSourceId(url) {
  return `gemini_${Buffer.from(url).toString('base64').slice(0, 60)}`;
}

async function saveRecipe(data, url, overrideCuisine) {
  const sourceId = buildSourceId(url);

  const existing = await prisma.recipe.findUnique({ where: { sourceId }, select: { id: true } });
  if (existing) return 'skip';

  const cuisineType = overrideCuisine || data.cuisineType || null;

  await prisma.recipe.create({
    data: {
      title: data.title?.slice(0, 200) ?? 'Sans titre',
      description: data.description?.slice(0, 600) ?? null,
      imageUrl: data.imageUrl ?? null,
      timeMinutes: typeof data.timeMinutes === 'number' ? data.timeMinutes : null,
      servings: typeof data.servings === 'number' ? data.servings : null,
      difficulty: ['Facile', 'Moyen', 'Difficile'].includes(data.difficulty) ? data.difficulty : 'Moyen',
      cuisineType,
      category: data.category ?? 'Plat principal',
      ingredients: Array.isArray(data.ingredients) ? data.ingredients.filter(i => i.name) : [],
      steps: Array.isArray(data.steps) ? data.steps.filter(s => s.description) : [],
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 10) : [],
      language: url.includes('.fr') || url.includes('196flavors') ? 'fr' : 'en',
      isPublic: true,
      enriched: true,   // Gemini a déjà structuré les données
      quality: 8,
      sourceApi: 'gemini-scrape',
      sourceId,
    },
  });

  return 'ok';
}

// ── Import une URL ────────────────────────────────────────────────────────────

async function processUrl(url, overrideCuisine) {
  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.log(`  ❌ Fetch: ${err.message}`);
    return 'error';
  }

  // Extrait l'og:image AVANT de stripper le HTML
  const pageImage = extractOgImage(html);

  const text = htmlToText(html);
  if (text.length < 200) {
    console.log(`  ⚠️  Contenu trop court (${text.length} chars) — JS-rendered ?`);
    return 'error';
  }

  let data;
  try {
    data = await extractWithGemini(text, url);
  } catch (err) {
    console.log(`  ❌ Gemini: ${err.message}`);
    return 'error';
  }

  // Priorité à l'og:image de la page (vraie photo du plat) si Gemini n'en a pas trouvé
  if (!data.imageUrl && pageImage) data.imageUrl = pageImage;

  if (!data.title || data.ingredients?.length === 0) {
    console.log(`  ⚠️  Recette non trouvée ou incomplète: "${data.title}"`);
    return 'error';
  }

  if (isDryRun) {
    console.log(`  🔍 [DRY-RUN] "${data.title}" — ${data.ingredients?.length} ingr., ${data.steps?.length} étapes, cuisine: ${data.cuisineType}`);
    return 'ok';
  }

  try {
    const status = await saveRecipe(data, url, overrideCuisine);
    if (status === 'skip') {
      console.log(`  ⏭️  "${data.title}" (déjà en DB)`);
    } else {
      console.log(`  ✅ "${data.title}" (${data.ingredients?.length} ingr., ${data.steps?.length} étapes)`);
    }
    return status;
  } catch (err) {
    console.log(`  ❌ DB: ${err.message}`);
    return 'error';
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY manquante dans .env');
    process.exit(1);
  }

  console.log('🤖 Scraping universel via Gemini');
  if (isDryRun) console.log('   Mode DRY-RUN\n');
  if (cuisineArg) console.log(`   Cuisine forcée : ${cuisineArg}\n`);

  let urls = [];
  if (urlArg) {
    urls = [urlArg];
  } else if (fileArg) {
    if (!fs.existsSync(fileArg)) { console.error(`❌ Fichier introuvable : ${fileArg}`); process.exit(1); }
    urls = fs.readFileSync(fileArg, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  } else {
    console.error('Usage: --url="..." OU --file=fichier.txt');
    process.exit(1);
  }

  console.log(`📋 ${urls.length} URL(s)\n`);

  let ok = 0, skip = 0, error = 0;
  for (const url of urls) {
    console.log(`\n🔗 ${url}`);
    const result = await processUrl(url, cuisineArg);
    if (result === 'ok') ok++;
    else if (result === 'skip') skip++;
    else error++;
    await sleep(DELAY_MS);
  }

  console.log(`\n📊 ✅ ${ok} importée(s) · ⏭️  ${skip} ignorée(s) · ❌ ${error} erreur(s)`);
  if (!isDryRun && ok > 0) console.log('💡 Enrichissement déjà fait (enriched: true). Optionnel: node scripts/generate-embeddings.js');
}

main().catch(console.error).finally(() => prisma.$disconnect());
