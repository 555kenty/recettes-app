import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeNutrition, type RecipeIngredient } from '@/lib/nutrition';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { ingredients: true, servings: true },
  });

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ingredients = (recipe.ingredients as RecipeIngredient[] | null) ?? [];
  const servings = recipe.servings ?? 1;

  try {
    const nutrition = await computeNutrition(ingredients, servings);
    return NextResponse.json(nutrition);
  } catch {
    return NextResponse.json({ error: 'Failed to compute nutrition' }, { status: 500 });
  }
}
