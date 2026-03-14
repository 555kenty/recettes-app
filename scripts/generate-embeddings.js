#!/usr/bin/env node
/**
 * Génère des embeddings vectoriels pour les recettes (via Gemini text-embedding-004)
 * Stocke dans la colonne `embedding` (vector 768) pour la recherche sémantique
 * Usage : node scripts/generate-embeddings.js [--dry-run] [--limit=N]
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
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : undefined;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-001'; // 768 dimensions

let processed = 0;
let errors = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildRecipeText(recipe) {
  const parts = [recipe.title];
  if (recipe.description) parts.push(recipe.description);
  if (recipe.cuisineType) parts.push(`Cuisine ${recipe.cuisineType}`);
  if (recipe.category) parts.push(recipe.category);
  if (recipe.tags && recipe.tags.length) parts.push(recipe.tags.join(', '));

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((i) => i.name).filter(Boolean)
    : [];
  if (ingredients.length) parts.push(`Ingrédients: ${ingredients.join(', ')}`);

  return parts.join('. ').slice(0, 2000);
}

async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embedding error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.embedding.values; // float[]
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('ERREUR: GEMINI_API_KEY requis');
    process.exit(1);
  }

  console.log(`=== Génération d'embeddings (Gemini ${EMBEDDING_MODEL}, 768 dim) ===`);
  if (DRY_RUN) console.log('Mode DRY-RUN');

  // Fetch recipes without embeddings
  const recipes = await prisma.recipe.findMany({
    where: { isPublic: true },
    select: { id: true, title: true, description: true, cuisineType: true, category: true, tags: true, ingredients: true },
    ...(LIMIT ? { take: LIMIT } : {}),
    orderBy: { createdAt: 'asc' },
  });

  // Filter those without embeddings (raw SQL check)
  const withoutEmbedding = await pool.query(
    `SELECT id FROM recipes WHERE embedding IS NULL AND is_public = true ${LIMIT ? `LIMIT ${LIMIT}` : ''}`
  );
  const idsToProcess = new Set(withoutEmbedding.rows.map((r) => r.id));
  const toProcess = recipes.filter((r) => idsToProcess.has(r.id));

  console.log(`${toProcess.length} recettes sans embedding`);

  for (const recipe of toProcess) {
    const text = buildRecipeText(recipe);
    process.stdout.write(`  [${processed + 1}/${toProcess.length}] ${recipe.title}... `);

    if (DRY_RUN) {
      console.log(`(${text.length} chars) [dry-run]`);
      processed++;
      continue;
    }

    try {
      const embedding = await getEmbedding(text);
      // Store as vector using raw SQL
      await pool.query(
        'UPDATE recipes SET embedding = $1 WHERE id = $2',
        [`[${embedding.join(',')}]`, recipe.id]
      );
      processed++;
      console.log(`✓ (${embedding.length} dim)`);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      errors++;
    }

    // Rate limit: ~1 req/sec
    await sleep(1100);
  }

  console.log('\n=== Résumé ===');
  console.log(`✓ Traités : ${processed}`);
  console.log(`✗ Erreurs : ${errors}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
