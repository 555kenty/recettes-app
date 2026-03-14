#!/usr/bin/env node
/**
 * Import ingrédients depuis OpenFoodFacts Search API
 * Rate limit : 10 req/min → délai 7s entre requêtes
 * Usage : node scripts/import-ingredients-off.js [--dry-run] [--limit=N]
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity;

const USER_AGENT = 'CuisineConnect/1.0 (contact@cuisineconnect.fr)';
const BASE_URL = 'https://world.openfoodfacts.org/api/v2/search';
const DELAY_MS = 7000; // 7s → ~8.5 req/min (under 10 req/min limit)

const INGREDIENT_CATEGORIES = [
  'spices',
  'herbs',
  'vegetables',
  'fruits',
  'meats',
  'fish-and-seafood',
  'dairy',
  'cereals-and-their-products',
  'legumes',
  'plant-oils',
];

const FIELDS = 'product_name,categories_tags,nutriments,image_front_small_url';

let imported = 0;
let skipped = 0;
let errors = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCategory(category, page = 1) {
  const url = `${BASE_URL}?categories_tags=${encodeURIComponent(category)}&fields=${FIELDS}&page_size=50&page=${page}&lc=fr`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${category} page ${page}`);
  return res.json();
}

function normalizeIngredientName(name) {
  if (!name) return null;
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/[®™]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 100);
}

async function processProduct(product) {
  const rawName = product.product_name;
  const name = normalizeIngredientName(rawName);
  if (!name || name.length < 2) return false;

  const tags = product.categories_tags || [];
  const category =
    (tags.find((t) => t.startsWith('en:')) || '')
      .replace('en:', '')
      .replace(/-/g, ' ') || null;

  const nutriments = product.nutriments || {};
  const caloriesPer100g = nutriments['energy-kcal_100g']
    ? Math.round(nutriments['energy-kcal_100g'])
    : null;

  const imageUrl = product.image_front_small_url || null;

  if (DRY_RUN) {
    console.log(`[dry-run] ${name} | ${category} | ${caloriesPer100g} kcal`);
    return true;
  }

  try {
    await prisma.ingredient.upsert({
      where: { name },
      create: { name, category, caloriesPer100g, imageUrl },
      update: {
        ...(category ? { category } : {}),
        ...(caloriesPer100g ? { caloriesPer100g } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
    return true;
  } catch (err) {
    console.error(`  ✗ Erreur upsert "${name}": ${err.message}`);
    return false;
  }
}

async function importCategory(category) {
  console.log(`\n── Catégorie : ${category}`);
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount && imported + skipped < LIMIT) {
    try {
      const data = await fetchCategory(category, page);
      pageCount = Math.ceil((data.count || 0) / 50);
      const products = data.products || [];

      console.log(`  Page ${page}/${pageCount} — ${products.length} produits`);

      for (const product of products) {
        if (imported + skipped >= LIMIT) break;
        const ok = await processProduct(product);
        if (ok) {
          imported++;
          if (!DRY_RUN && imported % 25 === 0) console.log(`  ✓ ${imported} ingrédients importés`);
        } else {
          skipped++;
        }
      }

      page++;
      if (page <= pageCount && imported + skipped < LIMIT) {
        await sleep(DELAY_MS);
      }
    } catch (err) {
      console.error(`  ✗ Erreur page ${page}: ${err.message}`);
      errors++;
      await sleep(DELAY_MS * 2);
      break;
    }
  }
}

async function main() {
  console.log('=== Import ingrédients OpenFoodFacts ===');
  if (DRY_RUN) console.log('Mode DRY-RUN (aucune écriture en DB)');
  if (LIMIT !== Infinity) console.log(`Limite : ${LIMIT} ingrédients`);
  console.log(`Délai entre requêtes : ${DELAY_MS}ms`);

  for (const category of INGREDIENT_CATEGORIES) {
    if (imported + skipped >= LIMIT) break;
    await importCategory(category);
    if (category !== INGREDIENT_CATEGORIES[INGREDIENT_CATEGORIES.length - 1]) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Résumé ===');
  console.log(`✓ Importés : ${imported}`);
  console.log(`⊘ Ignorés  : ${skipped}`);
  console.log(`✗ Erreurs  : ${errors}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
