// Script d'import TheMealDB → Prisma/Supabase
// Usage: node scripts/import-themealdb.js
// API gratuite, clé "1" pour dev — aucune clé requise
// ~300 recettes disponibles en accès gratuit

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';
const DELAY_MS = 500;

// ============================================
// UTILS
// ============================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`  ❌ Fetch error: ${url} → ${err.message}`);
    return null;
  }
}

// Parse les ingrédients depuis strIngredient1-20 / strMeasure1-20
function parseIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const quantity = meal[`strMeasure${i}`]?.trim();
    if (name && name !== '') {
      ingredients.push({ name, quantity: quantity || '', unit: '', category: 'Autre' });
    }
  }
  return ingredients;
}

// Parse les étapes depuis strInstructions (texte brut)
function parseSteps(instructions) {
  if (!instructions || instructions.trim() === '') return [];

  // Tentative 1 : numérotation explicite "1. Step" ou "1) Step"
  const numbered = instructions.match(/(?:^|\n)\s*(?:step\s*)?\d+[.):\s]+([^\n]+(?:\n(?!\s*\d+[.):\s])[^\n]+)*)/gi);
  if (numbered && numbered.length >= 2) {
    return numbered.map((s, i) => ({
      order: i + 1,
      description: s.replace(/^\s*(?:step\s*)?\d+[.):\s]+/i, '').trim().replace(/\n/g, ' '),
      duration_minutes: null,
      tip: null,
    }));
  }

  // Tentative 2 : split par double saut de ligne
  const paragraphs = instructions.split(/\r?\n\r?\n+/).map((s) => s.trim()).filter((s) => s.length > 15);
  if (paragraphs.length >= 2) {
    return paragraphs.map((s, i) => ({
      order: i + 1,
      description: s.replace(/\r?\n/g, ' ').trim(),
      duration_minutes: null,
      tip: null,
    }));
  }

  // Tentative 3 : split par saut de ligne simple
  const lines = instructions.split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 15);
  if (lines.length >= 2) {
    return lines.map((s, i) => ({ order: i + 1, description: s, duration_minutes: null, tip: null }));
  }

  // Fallback : bloc entier (sera enrichi par IA)
  return [{ order: 1, description: instructions.trim().replace(/\r?\n/g, ' '), duration_minutes: null, tip: null }];
}

// ============================================
// IMPORT
// ============================================

async function getAllAreas() {
  const data = await fetchJSON(`${BASE_URL}/list.php?a=list`);
  return data?.meals?.map((m) => m.strArea) ?? [];
}

async function getMealsByArea(area) {
  const data = await fetchJSON(`${BASE_URL}/filter.php?a=${encodeURIComponent(area)}`);
  return data?.meals ?? [];
}

async function getMealDetail(id) {
  await sleep(DELAY_MS);
  const data = await fetchJSON(`${BASE_URL}/lookup.php?i=${id}`);
  return data?.meals?.[0] ?? null;
}

async function upsertRecipe(meal, cuisineType) {
  const ingredients = parseIngredients(meal);
  const steps = parseSteps(meal.strInstructions);
  const tags = meal.strTags ? meal.strTags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  await prisma.recipe.upsert({
    where: { sourceId: `themealdb_${meal.idMeal}` },
    update: {},
    create: {
      title: meal.strMeal,
      description: null,
      imageUrl: meal.strMealThumb,
      videoUrl: meal.strYoutube || null,
      timeMinutes: null,
      difficulty: 'Moyen',
      calories: null,
      cuisineType,
      category: meal.strCategory || 'Plat principal',
      ingredients,
      steps,
      tags,
      language: 'en',
      isPublic: true,
      enriched: false,
      quality: 0,
      sourceApi: 'themealdb',
      sourceId: `themealdb_${meal.idMeal}`,
    },
  });
}

async function main() {
  console.log('🍽️  Import TheMealDB → Prisma\n');

  const areas = await getAllAreas();
  console.log(`📋 ${areas.length} cuisines : ${areas.join(', ')}\n`);

  let totalImported = 0;
  let totalErrors = 0;

  for (const area of areas) {
    const meals = await getMealsByArea(area);
    console.log(`\n🌍 ${area} — ${meals.length} recettes`);

    for (const mealStub of meals) {
      const meal = await getMealDetail(mealStub.idMeal);
      if (!meal) { totalErrors++; continue; }

      try {
        await upsertRecipe(meal, area);
        process.stdout.write(`  ✅ ${meal.strMeal}\n`);
        totalImported++;
      } catch (err) {
        process.stdout.write(`  ❌ ${meal.strMeal}: ${err.message}\n`);
        totalErrors++;
      }
    }

    await sleep(1000);
  }

  console.log('\n📊 Résumé:');
  console.log(`  ✅ Importées : ${totalImported}`);
  console.log(`  ❌ Erreurs   : ${totalErrors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
