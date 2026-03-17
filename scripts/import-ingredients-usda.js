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

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Config ───────────────────────────────────────────────────────────────────

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const DELAY_MS = 400; // USDA allows ~3 req/s on free tier

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

async function searchUSDA(query, retries = 3) {
  const params = new URLSearchParams({
    query,
    dataType: 'Foundation,SR Legacy,Survey (FNDDS)',
    pageSize: '5',
    api_key: USDA_API_KEY,
  });
  const url = `${USDA_BASE}/foods/search?${params}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.foods ?? [];
    }
    if (res.status === 429 || res.status === 400) {
      if (attempt < retries) {
        await sleep(DELAY_MS * attempt * 2);
        continue;
      }
    }
    throw new Error(`USDA HTTP ${res.status} for "${query}"`);
  }
  return [];
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
  // Multi-word first (order matters)
  [/\blait de coco\b/gi, 'coconut milk'],
  [/\bnoix de coco\b/gi, 'coconut'],
  [/\bnoix de cajou\b/gi, 'cashew'],
  [/\bnoix de muscade\b/gi, 'nutmeg'],
  [/\bnoix du bresil\b/gi, 'brazil nuts'],
  [/\bhuile d['']olive\b/gi, 'olive oil'],
  [/\bhuile de tournesol\b/gi, 'sunflower oil'],
  [/\bhuile de sésame\b/gi, 'sesame oil'],
  [/\bhuile v[eé]g[eé]tale\b/gi, 'vegetable oil'],
  [/\bhuile de palme\b/gi, 'palm oil'],
  [/\bhuile\b/gi, 'oil'],
  [/\bpommes? de terre\b/gi, 'potato'],
  [/\bpatate douce\b/gi, 'sweet potato'],
  [/\bpois chiches?\b/gi, 'chickpeas'],
  [/\bpois cassés?\b/gi, 'split peas'],
  [/\bvin blanc\b/gi, 'white wine'],
  [/\bvin rouge\b/gi, 'red wine'],
  [/\bsauce soja\b/gi, 'soy sauce'],
  [/\bcitron vert\b/gi, 'lime'],
  [/\bchou-fleur\b/gi, 'cauliflower'],
  [/\bcrème fraîche\b/gi, 'sour cream'],
  [/\bcrème liquide\b/gi, 'heavy cream'],
  [/\bcrème\b/gi, 'cream'],
  [/\bfarine de blé\b/gi, 'wheat flour'],
  [/\bfarine de maïs\b/gi, 'cornmeal'],
  [/\blevure chimique\b/gi, 'baking powder'],
  [/\blevure\b/gi, 'yeast'],
  [/\bchocolat noir\b/gi, 'dark chocolate'],
  [/\bchocolat au lait\b/gi, 'milk chocolate'],
  [/\bchocolat blanc\b/gi, 'white chocolate'],
  [/\bchocolat\b/gi, 'chocolate'],
  [/\bsucre glace\b/gi, 'powdered sugar'],
  [/\bsucre roux\b/gi, 'brown sugar'],
  [/\bsucre\b/gi, 'sugar'],
  [/\bpoivre noir\b/gi, 'black pepper'],
  [/\bpoivre\b/gi, 'black pepper'],
  [/\bpoivron rouge\b/gi, 'red bell pepper'],
  [/\bpoivron vert\b/gi, 'green bell pepper'],
  [/\bpoivrons?\b/gi, 'bell pepper'],
  [/\bpiment rouge\b/gi, 'red chili'],
  [/\bpiment vert\b/gi, 'green chili'],
  [/\bpiment\b/gi, 'chili pepper'],
  // Proteins
  [/\bpoulet\b/gi, 'chicken'],
  [/\bb[oœ]euf|bœuf\b/gi, 'beef'],
  [/\bveau\b/gi, 'veal'],
  [/\bporc\b/gi, 'pork'],
  [/\bagneau\b/gi, 'lamb'],
  [/\bdinde\b/gi, 'turkey'],
  [/\bcanard\b/gi, 'duck'],
  [/\blapin\b/gi, 'rabbit'],
  [/\bsaumon\b/gi, 'salmon'],
  [/\bthon\b/gi, 'tuna'],
  [/\bcabillaud\b/gi, 'cod'],
  [/\bmerlan\b/gi, 'whiting'],
  [/\bcrevettes?\b/gi, 'shrimp'],
  [/\bmoules?\b/gi, 'mussel'],
  [/\bpalourdes?\b/gi, 'clams'],
  [/\bhomard\b/gi, 'lobster'],
  [/\bcalmar\b/gi, 'squid'],
  // Dairy / eggs
  [/\boeuf|œuf\b/gi, 'egg'],
  [/\bbeurre\b/gi, 'butter'],
  [/\blait\b/gi, 'milk'],
  [/\bfromage blanc\b/gi, 'quark cheese'],
  [/\bfromage\b/gi, 'cheese'],
  [/\byaourt|yogourt\b/gi, 'yogurt'],
  // Vegetables
  [/\btomates? cerises?\b/gi, 'cherry tomato'],
  [/\btomates?\b/gi, 'tomato'],
  [/\boignons? rouge\b/gi, 'red onion'],
  [/\boignons?\b/gi, 'onion'],
  [/\bail\b/gi, 'garlic'],
  [/\bcarottes?\b/gi, 'carrot'],
  [/\bcourge\b/gi, 'squash'],
  [/\bcourgettes?\b/gi, 'zucchini'],
  [/\bépinards?\b/gi, 'spinach'],
  [/\bchampignons? de paris\b/gi, 'button mushroom'],
  [/\bchampignons?\b/gi, 'mushroom'],
  [/\baubergines?\b/gi, 'eggplant'],
  [/\bbrocoli\b/gi, 'broccoli'],
  [/\bchou\b/gi, 'cabbage'],
  [/\bbetterave\b/gi, 'beet'],
  [/\bpotiron\b/gi, 'pumpkin'],
  [/\bnavet\b/gi, 'turnip'],
  [/\bgombo\b/gi, 'okra'],
  [/\basperges?\b/gi, 'asparagus'],
  [/\bartichauts?\b/gi, 'artichoke'],
  [/\bconcombre\b/gi, 'cucumber'],
  [/\bcéleri|céleri\b/gi, 'celery'],
  [/\bceleri\b/gi, 'celery'],
  [/\bsalade\b/gi, 'lettuce'],
  [/\béchalotes?|echalotes?\b/gi, 'shallot'],
  [/\bpoireau\b/gi, 'leek'],
  [/\bmaïs\b/gi, 'corn'],
  [/\bpatate\b/gi, 'potato'],
  // Legumes / grains
  [/\blentilles?\b/gi, 'lentils'],
  [/\bharicots? blancs?\b/gi, 'white beans'],
  [/\bharicots? rouges?\b/gi, 'kidney beans'],
  [/\bharicots? verts?\b/gi, 'green beans'],
  [/\bharicots?\b/gi, 'beans'],
  [/\bfarine\b/gi, 'flour'],
  [/\briz\b/gi, 'rice'],
  [/\bpâtes\b/gi, 'pasta'],
  [/\bcouscous\b/gi, 'couscous'],
  [/\bquinoa\b/gi, 'quinoa'],
  [/\bpain\b/gi, 'bread'],
  [/\bchapelure\b/gi, 'breadcrumbs'],
  [/\btofu\b/gi, 'tofu'],
  // Fruits / nuts
  [/\bnoix\b/gi, 'walnut'],
  [/\bamandes?\b/gi, 'almonds'],
  [/\bcacahuètes?|cacahouètes?\b/gi, 'peanuts'],
  [/\bpistaches?\b/gi, 'pistachios'],
  [/\bpignons?\b/gi, 'pine nuts'],
  [/\bcitron\b/gi, 'lemon'],
  [/\bmangue\b/gi, 'mango'],
  [/\bbanane\b/gi, 'banana'],
  [/\bavocat\b/gi, 'avocado'],
  [/\bananas|ananas\b/gi, 'pineapple'],
  [/\boranges?\b/gi, 'orange'],
  [/\bpommes?\b/gi, 'apple'],
  [/\bfraises?\b/gi, 'strawberry'],
  [/\braisins? secs?\b/gi, 'raisins'],
  [/\braisins?\b/gi, 'grapes'],
  [/\bpapayes?\b/gi, 'papaya'],
  [/\bgoyave\b/gi, 'guava'],
  // Spices / herbs
  [/\bgingembre\b/gi, 'ginger'],
  [/\bcannelle\b/gi, 'cinnamon'],
  [/\bcurcuma\b/gi, 'turmeric'],
  [/\bpaprika\b/gi, 'paprika'],
  [/\bcumin\b/gi, 'cumin'],
  [/\bcoriandre\b/gi, 'coriander'],
  [/\bpersil\b/gi, 'parsley'],
  [/\bbasilic\b/gi, 'basil'],
  [/\bthym\b/gi, 'thyme'],
  [/\bromarin\b/gi, 'rosemary'],
  [/\bmenthe\b/gi, 'mint'],
  [/\borigan\b/gi, 'oregano'],
  [/\bsafran\b/gi, 'saffron'],
  [/\bcardamome\b/gi, 'cardamom'],
  [/\bclous? de girofle\b/gi, 'cloves'],
  [/\bnoix de muscade\b/gi, 'nutmeg'],
  [/\bvanille\b/gi, 'vanilla'],
  [/\bvinaigre balsamique\b/gi, 'balsamic vinegar'],
  [/\bvinaigre\b/gi, 'vinegar'],
  [/\bsel\b/gi, 'salt'],
  // Condiments / sauces
  [/\bjus de citron\b/gi, 'lemon juice'],
  [/\bjus d['']orange\b/gi, 'orange juice'],
  [/\bbouillon poulet\b/gi, 'chicken broth'],
  [/\bbouillon legumes\b/gi, 'vegetable broth'],
  [/\bbouillon boeuf\b/gi, 'beef broth'],
  [/\bbouillon\b/gi, 'broth'],
  [/\bsaucisses?\b/gi, 'sausage'],
  [/\blardons?\b/gi, 'bacon bits'],
  [/\bnouilles?\b/gi, 'noodles'],
  [/\bvermicelles?\b/gi, 'vermicelli'],
  [/\blaitue\b/gi, 'lettuce'],
  [/\broquette\b/gi, 'arugula'],
  [/\bmache\b/gi, 'lamb lettuce'],
  [/\bviande\b/gi, 'meat'],
  [/\bmoulu\b/gi, 'ground'],
  [/\blaurier\b/gi, 'bay leaf'],
  [/\bhalloumi\b/gi, 'halloumi cheese'],
  [/\bfeta\b/gi, 'feta cheese'],
  [/\bparmesan\b/gi, 'parmesan cheese'],
  [/\bmozzarella\b/gi, 'mozzarella'],
  [/\bgruyere\b/gi, 'gruyere cheese'],
  [/\bricotta\b/gi, 'ricotta'],
  [/\bpancetta\b/gi, 'pancetta'],
  [/\bprosciutto\b/gi, 'prosciutto'],
  [/\bchorizon?\b/gi, 'chorizo'],
  [/\bsaumon fume\b/gi, 'smoked salmon'],
  [/\bfume\b/gi, 'smoked'],
  [/\bsauce huitre\b/gi, 'oyster sauce'],
  [/\bsauce poisson\b/gi, 'fish sauce'],
  [/\bsauce worcestershire\b/gi, 'worcestershire sauce'],
  [/\bsauce tomate\b/gi, 'tomato sauce'],
  [/\bsauce piquante\b/gi, 'hot sauce'],
  [/\bpate de tomate\b/gi, 'tomato paste'],
  [/\bconcentre de tomate\b/gi, 'tomato paste'],
  [/\bmoutarde\b/gi, 'mustard'],
  [/\bvin\b/gi, 'wine'],
  [/\bcolombo\b/gi, 'curry powder'],
  [/\bmasala\b/gi, 'masala spice mix'],
  [/\bghee\b/gi, 'ghee'],
  [/\bsaindoux\b/gi, 'lard'],
  [/\bmiel\b/gi, 'honey'],
  [/\bfenouil\b/gi, 'fennel'],
];

// Strip French qualifiers that confuse USDA after translation (accent-stripped form)
const FR_QUALIFIERS = /\b(frais|fraiche|fraiches|cru|crue|crus|hache|hachee|emince|emincee|entier|entiere|rouge|vert|verte|blanc|blanche|noir|noire|doux|douce|seche|sechee|confit|confite|cuit|cuite|a point|pele|pelee|rape|rapee|en des|en poudre|en conserve|surgele|surgelee|nature|bio|de mer|de montagne|du pays|claire|feuilles?|thai|indien|indienne|africain|africaine|antillais|antillaise)\b/gi;

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toEnglish(name) {
  let result = name.toLowerCase().trim();
  // Normalise accents first so regex patterns match both é/e etc.
  result = stripAccents(result);
  // Remove parenthetical details: (rumsteck ou faux-filet) etc.
  result = result.replace(/\([^)]*\)/g, '').trim();
  for (const [pattern, replacement] of FR_TO_EN) {
    result = result.replace(pattern, replacement);
  }
  // Strip remaining French qualifiers
  result = result.replace(FR_QUALIFIERS, '').replace(/\s+/g, ' ').trim();
  // Strip any remaining non-ASCII characters (accents, special chars)
  result = result.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, ' ').trim();
  // Strip orphan French articles/prepositions that may be left over
  result = result.replace(/\b(de|du|des|le|la|les|un|une|au|aux|en|et|ou|a)\b/g, '').replace(/\s+/g, ' ').trim();
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
      const kcalCheck = extractNutrient(nutrients, NUTRIENT_KCAL);
      if ((nutrients.length < 4 || kcalCheck === null) && best.fdcId) {
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
