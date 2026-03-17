/**
 * import-ingredients-usda.js
 *
 * Extrait tous les noms d'ingrédients uniques de nos recettes,
 * interroge l'API USDA FoodData Central pour obtenir kcal + macros exacts,
 * et upsert dans la table `ingredients`.
 *
 * API gratuite : https://fdc.nal.usda.gov/api-key-signup.html
 *
 * Usage:
 *   USDA_API_KEY=xxxx node scripts/import-ingredients-usda.js
 *   USDA_API_KEY=xxxx node scripts/import-ingredients-usda.js --limit=50
 *   USDA_API_KEY=xxxx node scripts/import-ingredients-usda.js --enrich-existing
 *   USDA_API_KEY=xxxx node scripts/import-ingredients-usda.js --dry-run
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Config ───────────────────────────────────────────────────────────────────

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const DELAY_MS = 250; // USDA allows ~3 req/s on free tier

// USDA nutrient IDs
const NUTRIENT_KCAL     = 1008;
const NUTRIENT_PROTEIN  = 1003;
const NUTRIENT_FAT      = 1004;
const NUTRIENT_CARBS    = 1005;

// Prefer Foundation > SR Legacy > Survey data
const DATA_TYPE_PRIORITY = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN        = args.includes('--dry-run');
const ENRICH_EXISTING = args.includes('--enrich-existing');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractNutrient(foodNutrients, nutrientId) {
  const n = foodNutrients.find((n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId);
  return n ? parseFloat(n.value ?? n.amount ?? 0) : null;
}

function bestDataType(foods) {
  for (const type of DATA_TYPE_PRIORITY) {
    const match = foods.find((f) => f.dataType === type);
    if (match) return match;
  }
  return foods[0] ?? null;
}

async function searchUSDA(query) {
  const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)&pageSize=5&api_key=${USDA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA HTTP ${res.status} for "${query}"`);
  const data = await res.json();
  return data.foods ?? [];
}

async function fetchFoodDetail(fdcId) {
  const url = `${USDA_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// ─── Name normalisation for USDA search ──────────────────────────────────────
// USDA works best with English terms. Map common French words to English.

const FR_TO_EN = [
  [/\bpoulet\b/gi, 'chicken'], [/\bboeuf\b/gi, 'beef'], [/\bporc\b/gi, 'pork'],
  [/\bagneau\b/gi, 'lamb'],    [/\bdinde\b/gi, 'turkey'], [/\bcanard\b/gi, 'duck'],
  [/\bsaumon\b/gi, 'salmon'],  [/\bthon\b/gi, 'tuna'],   [/\bcabillaud\b/gi, 'cod'],
  [/\bcrevettes?\b/gi, 'shrimp'], [/\bmoules?\b/gi, 'mussel'],
  [/\btomates?\b/gi, 'tomato'], [/\boignons?\b/gi, 'onion'], [/\bail\b/gi, 'garlic'],
  [/\bcarottes?\b/gi, 'carrot'], [/\bcourge\b/gi, 'squash'], [/\bcourgettes?\b/gi, 'zucchini'],
  [/\bépinards?\b/gi, 'spinach'], [/\bchampignons?\b/gi, 'mushroom'],
  [/\baubergines?\b/gi, 'eggplant'], [/\bpoivrons?\b/gi, 'bell pepper'],
  [/\bpommes? de terre\b/gi, 'potato'], [/\bpatate douce\b/gi, 'sweet potato'],
  [/\bpois chiches?\b/gi, 'chickpeas'], [/\blentilles?\b/gi, 'lentils'],
  [/\bharicots?\b/gi, 'beans'], [/\bfarine\b/gi, 'flour'], [/\briz\b/gi, 'rice'],
  [/\bpâtes\b/gi, 'pasta'], [/\bcouscous\b/gi, 'couscous'], [/\bquinoa\b/gi, 'quinoa'],
  [/\bpain\b/gi, 'bread'], [/\bbeurre\b/gi, 'butter'], [/\bhomard\b/gi, 'lobster'],
  [/\bcrème\b/gi, 'cream'], [/\blait de coco\b/gi, 'coconut milk'],
  [/\blait\b/gi, 'milk'], [/\bfromage\b/gi, 'cheese'], [/\boeuf|œuf\b/gi, 'egg'],
  [/\bhuile d'olive\b/gi, 'olive oil'], [/\bhuile\b/gi, 'oil'],
  [/\bsucre\b/gi, 'sugar'], [/\bmiel\b/gi, 'honey'], [/\bchocolat\b/gi, 'chocolate'],
  [/\bnoix de coco\b/gi, 'coconut'], [/\bcitron vert\b/gi, 'lime'],
  [/\bcitron\b/gi, 'lemon'], [/\bangue\b/gi, 'mango'], [/\bbanane\b/gi, 'banana'],
  [/\bavocat\b/gi, 'avocado'], [/\bnoix\b/gi, 'walnut'], [/\bamandes?\b/gi, 'almonds'],
  [/\bcacahuètes?\b/gi, 'peanuts'], [/\bgingembre\b/gi, 'ginger'],
  [/\bcannelle\b/gi, 'cinnamon'], [/\bcurcuma\b/gi, 'turmeric'],
  [/\bpaprika\b/gi, 'paprika'], [/\bcumin\b/gi, 'cumin'], [/\bcoriandre\b/gi, 'coriander'],
  [/\bpersil\b/gi, 'parsley'], [/\bbasilique?\b/gi, 'basil'],
  [/\bthym\b/gi, 'thyme'], [/\bromarin\b/gi, 'rosemary'],
  [/\bpoivre\b/gi, 'black pepper'], [/\bsel\b/gi, 'salt'],
  [/\bvinaigre\b/gi, 'vinegar'], [/\bsauce soja\b/gi, 'soy sauce'],
  [/\bmoutarde\b/gi, 'mustard'], [/\bvin blanc\b/gi, 'white wine'],
  [/\bvin rouge\b/gi, 'red wine'], [/\bvin\b/gi, 'wine'],
  [/\bcolombo\b/gi, 'curry powder'], [/\bmasala\b/gi, 'masala spice mix'],
  [/\bpiment\b/gi, 'chili pepper'], [/\bechalote\b/gi, 'shallot'],
  [/\bfenouil\b/gi, 'fennel'], [/\bceleri\b/gi, 'celery'],
  [/\bchapelure\b/gi, 'breadcrumbs'], [/\blevure\b/gi, 'yeast'],
  [/\bmaïs\b/gi, 'corn'], [/\btofu\b/gi, 'tofu'], [/\bghee\b/gi, 'ghee'],
  [/\bsaindoux\b/gi, 'lard'], [/\bpoireau\b/gi, 'leek'],
  [/\bbrocoli\b/gi, 'broccoli'], [/\bchou-fleur\b/gi, 'cauliflower'],
  [/\bchou\b/gi, 'cabbage'], [/\bbetterave\b/gi, 'beet'],
  [/\bpotiron\b/gi, 'pumpkin'], [/\bnavet\b/gi, 'turnip'],
  [/\bgombo\b/gi, 'okra'], [/\basperges?\b/gi, 'asparagus'],
  [/\bartiaut\b/gi, 'artichoke'], [/\bconcombre\b/gi, 'cucumber'],
  [/\bcéleri\b/gi, 'celery'], [/\bsalade\b/gi, 'lettuce'],
  [/\béchalotes?\b/gi, 'shallot'], [/\bmenthe\b/gi, 'mint'],
  [/\bananas\b/gi, 'pineapple'], [/\boranges?\b/gi, 'orange'],
  [/\bpommes?\b/gi, 'apple'], [/\bfraises?\b/gi, 'strawberry'],
  [/\braisins?\b/gi, 'grapes'],
];

function toEnglish(name) {
  let result = name.toLowerCase().trim();
  for (const [pattern, replacement] of FR_TO_EN) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!USDA_API_KEY) {
    console.error('❌  USDA_API_KEY manquant.\n   Inscrivez-vous gratuitement : https://fdc.nal.usda.gov/api-key-signup.html');
    process.exit(1);
  }

  console.log(`🌽  USDA FoodData Central import — mode: ${DRY_RUN ? 'dry-run' : 'live'}`);

  let ingredientNames;

  if (ENRICH_EXISTING) {
    // Mode: enrich existing DB ingredients that lack macro data
    const existing = await prisma.ingredient.findMany({
      where: {
        OR: [
          { proteinsPer100g: null },
          { fatsPer100g: null },
          { carbsPer100g: null },
        ],
      },
      select: { name: true },
    });
    ingredientNames = existing.map((i) => i.name);
    console.log(`📦  ${ingredientNames.length} ingrédients existants sans macros à enrichir`);
  } else {
    // Mode: extract unique ingredient names from all recipes
    console.log('🔍  Extraction des noms d\'ingrédients depuis toutes les recettes…');
    const recipes = await prisma.recipe.findMany({
      select: { ingredients: true },
      where: { ingredients: { not: null } },
    });

    const nameSet = new Set();
    for (const recipe of recipes) {
      if (!Array.isArray(recipe.ingredients)) continue;
      for (const ing of recipe.ingredients) {
        if (ing.name && typeof ing.name === 'string') {
          // Normalise: lowercase, trim, remove quantities that crept into name
          const clean = ing.name.trim().toLowerCase()
            .replace(/^\d[\d/,.]*\s*/, '')  // remove leading numbers
            .replace(/\s+/g, ' ');
          if (clean.length > 1) nameSet.add(clean);
        }
      }
    }
    ingredientNames = [...nameSet];
    console.log(`📋  ${ingredientNames.length} noms d'ingrédients uniques extraits`);
  }

  if (LIMIT < Infinity) {
    ingredientNames = ingredientNames.slice(0, LIMIT);
    console.log(`🔢  Limité à ${LIMIT} ingrédients`);
  }

  let imported = 0, updated = 0, notFound = 0, errors = 0;

  for (let i = 0; i < ingredientNames.length; i++) {
    const rawName = ingredientNames[i];
    const searchQuery = toEnglish(rawName);

    process.stdout.write(`[${i + 1}/${ingredientNames.length}] "${rawName}" → "${searchQuery}" … `);

    try {
      const foods = await searchUSDA(searchQuery);

      if (!foods.length) {
        console.log('❌ not found');
        notFound++;
        await sleep(DELAY_MS);
        continue;
      }

      const best = bestDataType(foods);
      if (!best) { notFound++; console.log('❌ no usable result'); await sleep(DELAY_MS); continue; }

      // Get detailed nutrients (search results sometimes lack full nutrient list)
      let nutrients = best.foodNutrients ?? [];
      if (nutrients.length < 4 && best.fdcId) {
        const detail = await fetchFoodDetail(best.fdcId);
        if (detail) nutrients = detail.foodNutrients ?? nutrients;
        await sleep(DELAY_MS);
      }

      const kcal     = extractNutrient(nutrients, NUTRIENT_KCAL);
      const proteins = extractNutrient(nutrients, NUTRIENT_PROTEIN);
      const fats     = extractNutrient(nutrients, NUTRIENT_FAT);
      const carbs    = extractNutrient(nutrients, NUTRIENT_CARBS);

      if (kcal === null) {
        console.log(`⚠️  pas de kcal (fdcId=${best.fdcId})`);
        notFound++;
        await sleep(DELAY_MS);
        continue;
      }

      const usdaName = (best.description ?? rawName).toLowerCase();
      console.log(`✅  ${usdaName} → ${kcal} kcal | P:${proteins}g F:${fats}g C:${carbs}g [${best.dataType}]`);

      if (!DRY_RUN) {
        const exists = await prisma.ingredient.findUnique({ where: { name: rawName } });

        if (exists) {
          await prisma.ingredient.update({
            where: { name: rawName },
            data: {
              caloriesPer100g: Math.round(kcal),
              proteinsPer100g: proteins !== null ? Math.round(proteins * 10) / 10 : undefined,
              fatsPer100g:     fats    !== null ? Math.round(fats    * 10) / 10 : undefined,
              carbsPer100g:    carbs   !== null ? Math.round(carbs   * 10) / 10 : undefined,
              usdaFdcId:       best.fdcId ?? undefined,
            },
          });
          updated++;
        } else {
          await prisma.ingredient.create({
            data: {
              name:           rawName,
              caloriesPer100g: Math.round(kcal),
              proteinsPer100g: proteins !== null ? Math.round(proteins * 10) / 10 : null,
              fatsPer100g:     fats    !== null ? Math.round(fats    * 10) / 10 : null,
              carbsPer100g:    carbs   !== null ? Math.round(carbs   * 10) / 10 : null,
              usdaFdcId:       best.fdcId ?? null,
            },
          });
          imported++;
        }
      }
    } catch (err) {
      console.log(`🔴  erreur: ${err.message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Importés  : ${imported}`);
  console.log(`🔄  Mis à jour: ${updated}`);
  console.log(`❓  Introuvables: ${notFound}`);
  console.log(`🔴  Erreurs   : ${errors}`);
  if (DRY_RUN) console.log('\n⚠️  Mode dry-run — aucune écriture en DB');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
