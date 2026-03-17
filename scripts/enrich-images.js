// Script d'enrichissement des images manquantes
// Priorité 1 : TheMealDB search (vraies photos de plats par titre)
// Priorité 2 : Spoonacular complexSearch (large couverture anglaise)
// Priorité 3 : Pixabay (si PIXABAY_API_KEY défini)
// Sinon : laisse imageUrl à null (RecipeCard affiche un placeholder ChefHat)
//
// Usage :
//   node scripts/enrich-images.js              → toutes les recettes sans image
//   node scripts/enrich-images.js --limit=50   → limite à 50 recettes
//   node scripts/enrich-images.js --dry-run    → affiche sans écrire

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '500', 10);
const DELAY_MS = 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── TheMealDB (sans clé, vraies photos par titre) ─────────────────────────────

async function fetchMealDbImage(title) {
  try {
    const queries = [
      title.replace(/\([^)]*\)/g, '').trim().split(/\s+/).slice(0, 4).join(' '),
      title.split(/\s+/).slice(0, 2).join(' '),
    ];
    for (const q of queries) {
      if (!q || q.length < 2) continue;
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const img = data.meals?.[0]?.strMealThumb;
      if (img) return img;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Spoonacular (clé requise, large couverture multi-cuisine) ─────────────────

async function fetchSpoonacularImage(title) {
  try {
    const key = process.env.SPOONACULAR_API_KEY || '';
    if (!key) return null;
    const inParens = title.match(/\(([^)]+)\)/)?.[1];
    const queries = [
      title.replace(/\([^)]*\)/g, '').trim().split(/\s+/).slice(0, 4).join(' '),
      inParens,
      title.split(/\s+/)[0],
    ].filter(Boolean);

    for (const q of queries) {
      const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(q)}&apiKey=${key}&number=1`);
      if (!res.ok) continue;
      const data = await res.json();
      const img = data.results?.[0]?.image;
      if (img) return img;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Pixabay (clé optionnelle) ─────────────────────────────────────────────────

async function fetchPixabayUrl(title) {
  try {
    const key = process.env.PIXABAY_API_KEY || '';
    if (!key) return null;
    const q = encodeURIComponent(title.split(/\s+/).slice(0, 3).join(' '));
    const res = await fetch(`https://pixabay.com/api/?key=${key}&q=${q}&image_type=photo&category=food&per_page=3&safesearch=true`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.hits?.[0]?.webformatURL ?? null;
  } catch {
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🖼️  Enrichissement images manquantes\n');
  if (isDryRun) console.log('   Mode DRY-RUN\n');

  const recipes = await prisma.recipe.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] },
    select: { id: true, title: true, cuisineType: true },
    take: limitArg,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📋 ${recipes.length} recette(s) sans image\n`);
  if (recipes.length === 0) { console.log('✅ Toutes les recettes ont une image !'); return; }

  let updated = 0, failed = 0;

  for (const recipe of recipes) {
    process.stdout.write(`🔍 "${recipe.title}" → `);

    // TheMealDB → Spoonacular → Pixabay → null (pas de fallback cuisine)
    const imageUrl = await fetchMealDbImage(recipe.title)
      ?? await fetchSpoonacularImage(recipe.title)
      ?? await fetchPixabayUrl(recipe.title);

    if (!imageUrl) {
      console.log(`⏭️  Pas d'image trouvée (placeholder UI)`);
      failed++;
      await sleep(DELAY_MS);
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY-RUN] ${imageUrl}`);
      updated++;
    } else {
      await prisma.recipe.update({ where: { id: recipe.id }, data: { imageUrl } });
      console.log(`✅ ${imageUrl.split('/').pop().slice(0, 50)}`);
      updated++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📊 ✅ ${updated} image(s) trouvée(s) · ⏭️  ${failed} sans résultat (placeholder OK)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
