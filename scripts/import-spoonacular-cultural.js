// Script d'import Spoonacular → Prisma/Supabase
// Cible les cuisines sous-représentées : africaine, antillaise, maghrébine, etc.
//
// Usage :
//   node scripts/import-spoonacular-cultural.js
//   node scripts/import-spoonacular-cultural.js --cuisine="African" --max=50
//   node scripts/import-spoonacular-cultural.js --dry-run
//
// Tarification Spoonacular (free tier : 150 pts/jour) :
//   complexSearch                         → 1 pt
//   + addRecipeInformation=true par recette → 1 pt each
//   → avec number=20 : 1 + 20 = 21 pts par appel
//   → ~7 appels/jour max → ~140 recettes/jour

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';
const DELAY_MS = 1100; // Spoonacular : max ~1 req/sec

// ── Cuisines à importer (ordre de priorité) ──────────────────────────────────
// Spoonacular cuisine keys : https://spoonacular.com/food-api/docs#Cuisines
const CUISINE_TARGETS = [
  { spoonacular: 'African',        label: 'Africaine',      count: 50 },
  { spoonacular: 'Caribbean',      label: 'Antillaise',     count: 40 },
  { spoonacular: 'Middle Eastern', label: 'Middle Eastern', count: 30 },
  { spoonacular: 'Turkish',        label: 'Turkish',        count: 20 },
  { spoonacular: 'Korean',         label: 'Korean',         count: 20 },
  { spoonacular: 'Vietnamese',     label: 'Vietnamese',     count: 20 },
];

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const cuisineArg = args.find((a) => a.startsWith('--cuisine='))?.split('=')[1];
const maxArg = parseInt(args.find((a) => a.startsWith('--max='))?.split('=')[1] ?? '0', 10);

const targets = cuisineArg
  ? CUISINE_TARGETS.filter((c) => c.spoonacular.toLowerCase() === cuisineArg.toLowerCase() ||
      c.label.toLowerCase() === cuisineArg.toLowerCase())
  : CUISINE_TARGETS;

// ── Utils ─────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} — ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// Mappe extendedIngredients → notre format
function mapIngredients(extendedIngredients = []) {
  return extendedIngredients
    .filter((i) => i.name?.trim())
    .map((i) => ({
      name: i.name.trim(),
      quantity: i.amount ? String(i.amount) : '',
      unit: i.unit?.trim() ?? '',
      category: i.aisle ?? 'Autre',
    }));
}

// Mappe analyzedInstructions → notre format [{order, description}]
function mapSteps(analyzedInstructions = [], rawInstructions = '') {
  const parsed = analyzedInstructions?.[0]?.steps ?? [];
  if (parsed.length >= 2) {
    return parsed.map((s) => ({
      order: s.number,
      description: s.step.trim(),
      duration_minutes: s.length?.number ? Math.round(s.length.number / 60) || null : null,
      tip: null,
    }));
  }

  // Fallback : parser le rawInstructions HTML
  const text = rawInstructions
    .replace(/<[^>]+>/g, ' ')    // strip HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!text) return [];

  const lines = text.split(/\.\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 10);
  return lines.map((desc, i) => ({
    order: i + 1,
    description: desc.endsWith('.') ? desc : desc + '.',
    duration_minutes: null,
    tip: null,
  }));
}

// Normalise la difficulté
function mapDifficulty(readyInMinutes) {
  if (!readyInMinutes) return 'Moyen';
  if (readyInMinutes <= 20) return 'Facile';
  if (readyInMinutes <= 45) return 'Moyen';
  return 'Difficile';
}

// ── Fetch Spoonacular ────────────────────────────────────────────────────────

async function searchRecipes(cuisine, offset, number) {
  const params = new URLSearchParams({
    apiKey: API_KEY,
    cuisine,
    number: String(number),
    offset: String(offset),
    addRecipeInformation: 'true',
    fillIngredients: 'true',
    instructionsRequired: 'true',
    sort: 'popularity',
  });
  const data = await fetchJSON(`${BASE_URL}/recipes/complexSearch?${params}`);
  return data;
}

// ── Import ───────────────────────────────────────────────────────────────────

async function importCuisine({ spoonacular, label, count }) {
  const perPage = 20; // max recommandé pour économiser les points
  const total = maxArg > 0 ? Math.min(maxArg, count) : count;
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`\n🌍  ${label} (${spoonacular}) — objectif ${total} recettes`);

  for (let offset = 0; offset < total; offset += perPage) {
    const number = Math.min(perPage, total - offset);
    let data;
    try {
      data = await searchRecipes(spoonacular, offset, number);
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  ❌ Erreur API offset=${offset}: ${err.message}`);
      if (err.message.includes('402') || err.message.includes('402')) {
        console.error('  ⚠️  Quota Spoonacular épuisé pour aujourd\'hui.');
        break;
      }
      errors++;
      continue;
    }

    const results = data.results ?? [];
    if (results.length === 0) {
      console.log(`  ⚠️  Aucun résultat à offset ${offset}`);
      break;
    }

    for (const recipe of results) {
      const sourceId = `spoonacular_${recipe.id}`;

      // Vérifier si déjà en DB
      const existing = await prisma.recipe.findUnique({ where: { sourceId }, select: { id: true } });
      if (existing) {
        process.stdout.write(`  ⏭️  ${recipe.title} (déjà importée)\n`);
        skipped++;
        continue;
      }

      const ingredients = mapIngredients(recipe.extendedIngredients);
      const steps = mapSteps(recipe.analyzedInstructions, recipe.instructions ?? '');
      const tags = [
        ...(recipe.diets ?? []),
        ...(recipe.dishTypes ?? []),
      ].map((t) => t.toLowerCase());

      if (isDryRun) {
        console.log(`  🔍 [DRY RUN] ${recipe.title} — ${ingredients.length} ingr., ${steps.length} étapes`);
        imported++;
        continue;
      }

      try {
        await prisma.recipe.create({
          data: {
            title: recipe.title,
            description: recipe.summary
              ? recipe.summary.replace(/<[^>]+>/g, '').slice(0, 500)
              : null,
            imageUrl: recipe.image ?? null,
            videoUrl: null,
            timeMinutes: recipe.readyInMinutes ?? null,
            servings: recipe.servings ?? null,
            difficulty: mapDifficulty(recipe.readyInMinutes),
            calories: recipe.nutrition?.nutrients?.find((n) => n.name === 'Calories')?.amount
              ? Math.round(recipe.nutrition.nutrients.find((n) => n.name === 'Calories').amount)
              : null,
            cuisineType: label,
            category: recipe.dishTypes?.[0] ?? 'Plat principal',
            ingredients,
            steps,
            tags,
            language: 'en',
            isPublic: true,
            enriched: false,
            quality: 6,
            sourceApi: 'spoonacular',
            sourceId,
          },
        });
        process.stdout.write(`  ✅ ${recipe.title}\n`);
        imported++;
      } catch (err) {
        process.stdout.write(`  ❌ ${recipe.title}: ${err.message}\n`);
        errors++;
      }
    }
  }

  return { imported, skipped, errors };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('❌ SPOONACULAR_API_KEY manquante dans .env');
    process.exit(1);
  }

  console.log('🍽️  Import Spoonacular → Prisma (cuisines culturelles)');
  if (isDryRun) console.log('   Mode DRY RUN — aucune écriture en DB\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const target of targets) {
    const stats = await importCuisine(target);
    totalImported += stats.imported;
    totalSkipped += stats.skipped;
    totalErrors += stats.errors;
  }

  console.log('\n📊 Résumé global :');
  console.log(`  ✅ Importées : ${totalImported}`);
  console.log(`  ⏭️  Ignorées  : ${totalSkipped} (déjà en DB)`);
  console.log(`  ❌ Erreurs   : ${totalErrors}`);
  console.log('\n💡 Prochaine étape : node scripts/enrich-recipes.js --limit=200');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
