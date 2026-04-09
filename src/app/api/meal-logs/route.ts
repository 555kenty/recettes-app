import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { computeNutrition, type RecipeIngredient } from '@/lib/nutrition';

// GET /api/meal-logs?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get('date'); // YYYY-MM-DD
  let start: Date;
  let end: Date;

  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split('-').map(Number);
    start = new Date(y, m - 1, d, 0, 0, 0, 0);
    end   = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else {
    start = new Date(); start.setHours(0, 0, 0, 0);
    end   = new Date(); end.setHours(23, 59, 59, 999);
  }

  const logs = await prisma.mealLog.findMany({
    where: { userId: session.user.id, loggedAt: { gte: start, lte: end } },
    orderBy: { loggedAt: 'asc' },
  });

  return NextResponse.json({ logs });
}

// POST /api/meal-logs
// Body option A (existing recipe): { recipeId: string, servings?: number }
// Body option B (custom meal):     { name: string, ingredients: [], servings?: number, imageUrl?: string }
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  let name: string;
  let imageUrl: string | null = null;
  let ingredients: RecipeIngredient[] = [];
  let servings = body.servings ?? 1;
  let recipeId: string | null = null;
  let kcal = 0, proteins = 0, fats = 0, carbs = 0;

  if (body.recipeId) {
    // ── Mode recette existante ────────────────────────────────────────────────
    const recipe = await prisma.recipe.findUnique({
      where: { id: body.recipeId },
      select: { id: true, title: true, imageUrl: true, ingredients: true, servings: true },
    });
    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

    recipeId = recipe.id;
    name = recipe.title;
    imageUrl = recipe.imageUrl ?? null;
    ingredients = (recipe.ingredients as RecipeIngredient[] | null) ?? [];
    servings = body.servings ?? recipe.servings ?? 1;

    try {
      const nutrition = await computeNutrition(ingredients, servings);
      kcal     = Math.round(nutrition.perServing.kcal     * servings);
      proteins = Math.round(nutrition.perServing.proteins * servings * 10) / 10;
      fats     = Math.round(nutrition.perServing.fats     * servings * 10) / 10;
      carbs    = Math.round(nutrition.perServing.carbs    * servings * 10) / 10;
    } catch { /* macros stay 0 if computation fails */ }
  } else {
    // ── Mode repas maison ─────────────────────────────────────────────────────
    if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    name        = body.name.trim();
    imageUrl    = body.imageUrl ?? null;
    ingredients = body.ingredients ?? [];
    servings    = body.servings ?? 1;

    try {
      const nutrition = await computeNutrition(ingredients, servings);
      kcal     = Math.round(nutrition.kcal);
      proteins = Math.round(nutrition.proteins * 10) / 10;
      fats     = Math.round(nutrition.fats * 10) / 10;
      carbs    = Math.round(nutrition.carbs * 10) / 10;
    } catch { /* macros stay 0 */ }
  }

  const log = await prisma.mealLog.create({
    data: {
      userId: session.user.id,
      recipeId,
      name,
      imageUrl,
      ingredients: ingredients as object[],
      servings,
      kcal,
      proteins,
      fats,
      carbs,
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}
