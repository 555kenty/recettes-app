import { prisma } from '@/lib/prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  name: string;
  quantity?: string | number | null;
  unit?: string | null;
}

export interface NutritionResult {
  kcal: number;
  proteins: number;
  fats: number;
  carbs: number;
  perServing: { kcal: number; proteins: number; fats: number; carbs: number };
  matchedCount: number;
}

// ─── Unit normalization ─────────────────────────────────────────────────────

const GRAM_UNITS = new Set(['g', 'gr', 'gramme', 'grammes', 'gram', 'grams']);
const ML_UNITS = new Set(['ml', 'millilitre', 'millilitres', 'milliliter']);
const PIECE_UNITS = new Set([
  'pièce', 'pièces', 'piece', 'pieces', 'unité', 'unités',
  'unit', 'units', '', 'tranche', 'tranches', 'feuille', 'feuilles',
  'gousse', 'gousses', 'brin', 'brins', 'bouquet', 'bouquets',
]);
const SPOON_UNITS: Record<string, number> = {
  'cuillère à soupe': 15,
  'cuillères à soupe': 15,
  'c. à soupe': 15,
  'cas': 15,
  'cs': 15,
  'tbsp': 15,
  'cuillère à café': 5,
  'cuillères à café': 5,
  'c. à café': 5,
  'cac': 5,
  'cc': 5,
  'tsp': 5,
};
const KG_UNITS = new Set(['kg', 'kilogramme', 'kilogrammes']);
const LITER_UNITS = new Set(['l', 'litre', 'litres', 'liter']);

/**
 * Parse a raw quantity value into grams.
 * Returns null if we cannot determine the weight.
 */
function parseQuantityInGrams(
  rawQuantity: string | number | null | undefined,
  rawUnit: string | null | undefined,
): number | null {
  if (rawQuantity == null && rawUnit == null) return 100; // no info at all → assume 100g

  const unit = (rawUnit ?? '').trim().toLowerCase();
  let qty: number;

  if (typeof rawQuantity === 'number') {
    qty = rawQuantity;
  } else if (typeof rawQuantity === 'string') {
    // Handle fractions like "1/2"
    const fractionMatch = rawQuantity.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      qty = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    } else {
      // Try to extract the first number from the string
      const numMatch = rawQuantity.match(/[\d]+([.,]\d+)?/);
      if (!numMatch) return 100; // can't parse → default 100g
      qty = parseFloat(numMatch[0].replace(',', '.'));
    }
  } else {
    return 100;
  }

  if (isNaN(qty) || qty <= 0) return 100;

  // Convert to grams based on unit
  if (GRAM_UNITS.has(unit)) return qty;
  if (ML_UNITS.has(unit)) return qty; // 1ml ≈ 1g for most ingredients
  if (KG_UNITS.has(unit)) return qty * 1000;
  if (LITER_UNITS.has(unit)) return qty * 1000;
  if (SPOON_UNITS[unit] !== undefined) return qty * SPOON_UNITS[unit];
  if (PIECE_UNITS.has(unit)) return qty * 100; // 1 piece ≈ 100g default
  if (unit === 'cl') return qty * 10;

  // No unit recognized: if raw quantity looks like grams (> 1), assume grams
  // If < 1, assume it's a count → multiply by 100
  if (!unit) {
    return qty >= 1 ? qty : qty * 100;
  }

  // Unknown unit → assume 100g per unit
  return qty * 100;
}

// ─── Main computation ───────────────────────────────────────────────────────

/**
 * Compute total and per-serving nutrition for a list of recipe ingredients.
 *
 * Looks up each ingredient by name (case-insensitive) in the `ingredients`
 * table, falling back to `ingredient_synonyms`. Since the DB only has
 * `caloriesPer100g`, proteins/fats/carbs are estimated using standard
 * macro-calorie ratios when not available.
 */
export async function computeNutrition(
  ingredients: RecipeIngredient[],
  servings: number,
): Promise<NutritionResult> {
  const safeServings = Math.max(1, servings);

  let totalKcal = 0;
  let totalProteins = 0;
  let totalFats = 0;
  let totalCarbs = 0;
  let matchedCount = 0;

  // Batch-fetch all ingredient names at once for performance
  const names = ingredients.map((i) => i.name.trim().toLowerCase());

  // 1. Direct match by name (case-insensitive)
  const directMatches = await prisma.ingredient.findMany({
    where: {
      name: { in: names, mode: 'insensitive' },
    },
  });

  const matchedByName = new Map<string, typeof directMatches[0]>();
  for (const ing of directMatches) {
    matchedByName.set(ing.name.toLowerCase(), ing);
  }

  // 2. For unmatched, try synonyms
  const unmatchedNames = names.filter((n) => !matchedByName.has(n));

  const synonymMatches =
    unmatchedNames.length > 0
      ? await prisma.ingredientSynonym.findMany({
          where: {
            synonym: { in: unmatchedNames, mode: 'insensitive' },
          },
          include: { ingredient: true },
        })
      : [];

  const matchedBySynonym = new Map<string, typeof directMatches[0]>();
  for (const syn of synonymMatches) {
    matchedBySynonym.set(syn.synonym.toLowerCase(), syn.ingredient);
  }

  // 3. Calculate totals
  for (const recipeIng of ingredients) {
    const key = recipeIng.name.trim().toLowerCase();
    const dbIng = matchedByName.get(key) ?? matchedBySynonym.get(key);

    if (!dbIng || dbIng.caloriesPer100g == null) continue;

    matchedCount++;

    const grams = parseQuantityInGrams(recipeIng.quantity, recipeIng.unit) ?? 100;
    const factor = grams / 100;

    const kcal = dbIng.caloriesPer100g * factor;

    // Estimate macros from kcal using a balanced ratio:
    // ~20% protein, ~30% fat, ~50% carbs (by calories)
    // protein = 4 kcal/g, fat = 9 kcal/g, carbs = 4 kcal/g
    const proteinKcal = kcal * 0.2;
    const fatKcal = kcal * 0.3;
    const carbsKcal = kcal * 0.5;

    totalKcal += kcal;
    totalProteins += proteinKcal / 4;
    totalFats += fatKcal / 9;
    totalCarbs += carbsKcal / 4;
  }

  return {
    kcal: Math.round(totalKcal),
    proteins: Math.round(totalProteins * 10) / 10,
    fats: Math.round(totalFats * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    perServing: {
      kcal: Math.round(totalKcal / safeServings),
      proteins: Math.round((totalProteins / safeServings) * 10) / 10,
      fats: Math.round((totalFats / safeServings) * 10) / 10,
      carbs: Math.round((totalCarbs / safeServings) * 10) / 10,
    },
    matchedCount,
  };
}
