import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Build synonym → canonical name map from DB
async function buildSynonymMap(): Promise<Map<string, string>> {
  const synonyms = await prisma.ingredientSynonym.findMany({
    include: { ingredient: { select: { name: true } } },
  });
  const map = new Map<string, string>();
  for (const s of synonyms) {
    map.set(s.synonym, s.ingredient.name);
  }
  return map;
}

// Expand a pantry item to include its canonical name if it's a synonym
function expandItem(item: string, synonymMap: Map<string, string>): string[] {
  const canonical = synonymMap.get(item);
  return canonical ? [item, canonical] : [item];
}

// POST { pantryItems: string[] } → recettes matchées triées par score
export async function POST(req: NextRequest) {
  const body = await req.json();
  const rawItems: string[] = (body.pantryItems ?? []).map((s: string) => s.toLowerCase().trim());

  if (rawItems.length === 0) {
    return NextResponse.json({ recipes: [] });
  }

  // Expand pantry items with synonyms for better matching
  const synonymMap = await buildSynonymMap();
  const pantryItems = rawItems.flatMap((item) => expandItem(item, synonymMap));

  const recipes = await prisma.recipe.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      timeMinutes: true,
      difficulty: true,
      cuisineType: true,
      category: true,
      tags: true,
      ingredients: true,
      likeCount: true,
      enriched: true,
    },
    take: 500,
  });

  type Ingredient = { name?: string };

  const scored = recipes
    .map((recipe) => {
      const recipeIngredients: string[] = Array.isArray(recipe.ingredients)
        ? (recipe.ingredients as Ingredient[]).map((ing) => (ing.name ?? '').toLowerCase())
        : [];

      if (recipeIngredients.length === 0) return null;

      const matched = rawItems.filter((item) => {
        const expanded = expandItem(item, synonymMap);
        return recipeIngredients.some((ri) =>
          expanded.some((e) => ri.includes(e) || e.includes(ri))
        );
      });

      const score = matched.length / recipeIngredients.length;
      const missing = recipeIngredients.filter((ri) => {
        return !rawItems.some((item) => {
          const expanded = expandItem(item, synonymMap);
          return expanded.some((e) => ri.includes(e) || e.includes(ri));
        });
      });

      return { ...recipe, matchScore: score, matchedCount: matched.length, missingIngredients: missing };
    })
    .filter((r) => r !== null && r.matchScore > 0)
    .sort((a, b) => b!.matchScore - a!.matchScore)
    .slice(0, 20);

  return NextResponse.json({ recipes: scored });
}
