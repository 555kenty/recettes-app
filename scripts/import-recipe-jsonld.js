// Script d'import via JSON-LD (schema.org/Recipe)
// Lit les données structurées embarquées dans les pages de recettes.
// Compatible avec : Marmiton, 750g, AllRecipes, caribbeanpot.com,
//                   latabledejulie.com, cuisine-facile.com, et +200 autres sites.
//
// Usage :
//   node scripts/import-recipe-jsonld.js --url="https://www.caribbeanpot.com/..."
//   node scripts/import-recipe-jsonld.js --file=urls.txt          (une URL par ligne)
//   node scripts/import-recipe-jsonld.js --file=urls.txt --dry-run
//
// Exemple de fichier urls.txt :
//   https://www.caribbeanpot.com/curry-chicken/
//   https://www.marmiton.org/recettes/recette_accras-de-morue_12345.aspx
//   https://www.750g.com/colombo-de-poulet-r85234.htm

require('dotenv/config');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DELAY_MS = 1200;
const USER_AGENT = 'Mozilla/5.0 (compatible; CuisineConnect/1.0; +https://cuisineconnect.fr)';

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const urlArg = args.find((a) => a.startsWith('--url='))?.split('=').slice(1).join('=');
const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
const cuisineArg = args.find((a) => a.startsWith('--cuisine='))?.split('=')[1];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fetch + extraction JSON-LD ────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of matches) {
    try {
      const json = JSON.parse(match[1]);
      // Peut être un objet direct ou un tableau
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item['@type'] === 'Recipe') return item;
        // Parfois imbriqué dans un @graph
        if (item['@graph']) {
          const recipe = item['@graph'].find((g) => g['@type'] === 'Recipe');
          if (recipe) return recipe;
        }
      }
    } catch {}
  }
  return null;
}

// ── Mapping schema.org/Recipe → notre schéma ─────────────────────────────────

function parseISO8601Duration(duration) {
  if (!duration) return null;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  return hours * 60 + minutes || null;
}

function mapIngredients(recipeIngredients = []) {
  return recipeIngredients.map((raw) => {
    const str = typeof raw === 'string' ? raw : raw.name ?? '';
    // Essaie de parser "200g de farine" ou "2 cups flour"
    const quantityMatch = str.match(/^([\d.,/½¼¾⅓⅔]+)\s*([a-zA-Zg°éèêàùûâôî.]+\b)?\s+(?:de\s+)?(.+)/);
    if (quantityMatch) {
      return {
        name: quantityMatch[3]?.trim() ?? str,
        quantity: quantityMatch[1],
        unit: quantityMatch[2]?.trim() ?? '',
        category: 'Autre',
      };
    }
    return { name: str.trim(), quantity: '', unit: '', category: 'Autre' };
  }).filter((i) => i.name.length > 0);
}

function mapSteps(instructions) {
  if (!instructions) return [];

  // HowToStep objects
  if (Array.isArray(instructions)) {
    const steps = instructions.flatMap((block, bi) => {
      if (block['@type'] === 'HowToSection' && Array.isArray(block.itemListElement)) {
        return block.itemListElement.map((s, si) => ({
          order: bi * 100 + si + 1,
          description: (s.text ?? s.name ?? '').replace(/<[^>]+>/g, '').trim(),
          duration_minutes: null,
          tip: null,
        }));
      }
      if (block['@type'] === 'HowToStep') {
        return [{
          order: bi + 1,
          description: (block.text ?? block.name ?? '').replace(/<[^>]+>/g, '').trim(),
          duration_minutes: null,
          tip: null,
        }];
      }
      if (typeof block === 'string') {
        return [{ order: bi + 1, description: block.replace(/<[^>]+>/g, '').trim(), duration_minutes: null, tip: null }];
      }
      return [];
    }).filter((s) => s.description.length > 5);

    // Réindexer
    return steps.map((s, i) => ({ ...s, order: i + 1 }));
  }

  // Texte brut
  if (typeof instructions === 'string') {
    const text = instructions.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const lines = text.split(/\r?\n+/).map((l) => l.trim()).filter((l) => l.length > 10);
    return lines.map((desc, i) => ({ order: i + 1, description: desc, duration_minutes: null, tip: null }));
  }

  return [];
}

function mapRecipe(ld, sourceUrl, overrideCuisine) {
  const ingredients = mapIngredients(ld.recipeIngredient ?? []);
  const steps = mapSteps(ld.recipeInstructions);

  const prepTime = parseISO8601Duration(ld.prepTime);
  const cookTime = parseISO8601Duration(ld.cookTime);
  const totalTime = parseISO8601Duration(ld.totalTime) ?? (prepTime && cookTime ? prepTime + cookTime : prepTime ?? cookTime ?? null);

  const cuisineRaw = Array.isArray(ld.recipeCuisine) ? ld.recipeCuisine[0] : ld.recipeCuisine;
  const cuisineType = overrideCuisine ?? cuisineRaw ?? null;

  const categoryRaw = Array.isArray(ld.recipeCategory) ? ld.recipeCategory[0] : ld.recipeCategory;

  const imageUrl = typeof ld.image === 'string'
    ? ld.image
    : Array.isArray(ld.image) ? ld.image[0]
    : ld.image?.url ?? null;

  const keywords = typeof ld.keywords === 'string'
    ? ld.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
    : Array.isArray(ld.keywords) ? ld.keywords.map((k) => k.toLowerCase())
    : [];

  const description = typeof ld.description === 'string'
    ? ld.description.replace(/<[^>]+>/g, '').slice(0, 600)
    : null;

  return {
    title: ld.name?.trim() ?? 'Sans titre',
    description,
    imageUrl,
    timeMinutes: totalTime,
    servings: typeof ld.recipeYield === 'string'
      ? parseInt(ld.recipeYield, 10) || null
      : Array.isArray(ld.recipeYield) ? parseInt(ld.recipeYield[0], 10) || null
      : typeof ld.recipeYield === 'number' ? ld.recipeYield : null,
    difficulty: totalTime ? (totalTime <= 20 ? 'Facile' : totalTime <= 45 ? 'Moyen' : 'Difficile') : 'Moyen',
    cuisineType,
    category: categoryRaw ?? 'Plat principal',
    ingredients,
    steps,
    tags: keywords.slice(0, 10),
    language: sourceUrl.includes('.fr') || cuisineRaw?.includes('français') ? 'fr' : 'en',
    isPublic: true,
    enriched: false,
    quality: 7,
    sourceApi: 'jsonld',
    sourceId: `jsonld_${Buffer.from(sourceUrl).toString('base64').slice(0, 60)}`,
  };
}

// ── Import une URL ────────────────────────────────────────────────────────────

async function importUrl(url, overrideCuisine) {
  let html;
  try {
    html = await fetchPage(url);
  } catch (err) {
    console.log(`  ❌ Fetch: ${err.message}`);
    return false;
  }

  const ld = extractJsonLd(html);
  if (!ld) {
    console.log(`  ⚠️  Aucun JSON-LD Recipe trouvé sur ${url}`);
    return false;
  }

  const data = mapRecipe(ld, url, overrideCuisine);

  if (data.ingredients.length === 0) {
    console.log(`  ⚠️  Aucun ingrédient parsé pour "${data.title}"`);
    return false;
  }

  if (isDryRun) {
    console.log(`  🔍 [DRY RUN] "${data.title}" — ${data.ingredients.length} ingr., ${data.steps.length} étapes, cuisine: ${data.cuisineType}`);
    return true;
  }

  const existing = await prisma.recipe.findUnique({ where: { sourceId: data.sourceId }, select: { id: true } });
  if (existing) {
    console.log(`  ⏭️  "${data.title}" (déjà en DB)`);
    return true;
  }

  try {
    await prisma.recipe.create({ data });
    console.log(`  ✅ "${data.title}"`);
    return true;
  } catch (err) {
    console.log(`  ❌ DB: ${err.message}`);
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌐  Import JSON-LD Recipe → Prisma');
  if (isDryRun) console.log('   Mode DRY RUN\n');

  let urls = [];

  if (urlArg) {
    urls = [urlArg];
  } else if (fileArg) {
    if (!fs.existsSync(fileArg)) {
      console.error(`❌ Fichier introuvable : ${fileArg}`);
      process.exit(1);
    }
    urls = fs.readFileSync(fileArg, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  } else {
    console.error('Usage : node scripts/import-recipe-jsonld.js --url="..." OU --file=urls.txt');
    process.exit(1);
  }

  console.log(`📋 ${urls.length} URL(s) à traiter\n`);

  let ok = 0, fail = 0;
  for (const url of urls) {
    console.log(`\n🔗 ${url}`);
    const success = await importUrl(url, cuisineArg);
    success ? ok++ : fail++;
    await sleep(DELAY_MS);
  }

  console.log(`\n📊 Résultat : ✅ ${ok} importée(s) · ❌ ${fail} échouée(s)`);
  console.log('💡 Prochaine étape : node scripts/enrich-recipes.js pour enrichir avec IA');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
