import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export interface RecipeGroupItem { name: string; quantity: string; checked: boolean }
export interface RecipeGroup { recipeId: string; recipeTitle: string; recipeImageUrl: string | null; items: RecipeGroupItem[] }
export interface FreeItem { name: string; checked: boolean }
export interface ShoppingListData { recipes: RecipeGroup[]; freeItems: FreeItem[] }

function normalise(raw: unknown): ShoppingListData {
  // Backward-compat: old lists stored a flat array as items
  if (Array.isArray(raw)) {
    return { recipes: [], freeItems: raw as FreeItem[] };
  }
  const d = raw as Partial<ShoppingListData> | null;
  return { recipes: d?.recipes ?? [], freeItems: d?.freeItems ?? [] };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lists = await prisma.shoppingList.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ lists });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // ── Mode B: add a recipe group ─────────────────────────────────────────────
  if (body.recipeId) {
    const { recipeId, recipeTitle, recipeImageUrl, ingredients } = body as {
      recipeId: string;
      recipeTitle: string;
      recipeImageUrl: string | null;
      ingredients: { name: string; quantity?: string }[];
    };

    // Find existing list or create
    const existing = await prisma.shoppingList.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    const newGroup: RecipeGroup = {
      recipeId,
      recipeTitle,
      recipeImageUrl: recipeImageUrl ?? null,
      items: ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity ?? '',
        checked: false,
      })),
    };

    if (existing) {
      const data = normalise(existing.items);
      // Dedup: remove previous version of this recipe if already in list
      data.recipes = data.recipes.filter((r) => r.recipeId !== recipeId);
      data.recipes.push(newGroup);

      const updated = await prisma.shoppingList.update({
        where: { id: existing.id },
        data: { items: data as object },
      });
      return NextResponse.json({ list: updated });
    } else {
      const list = await prisma.shoppingList.create({
        data: {
          userId: session.user.id,
          name: 'Ma liste',
          items: { recipes: [newGroup], freeItems: [] } as object,
        },
      });
      return NextResponse.json({ list }, { status: 201 });
    }
  }

  // ── Mode A: create a list with free items (legacy / direct) ───────────────
  const { name, items } = body;
  const data: ShoppingListData = normalise(items ?? []);

  const list = await prisma.shoppingList.create({
    data: {
      userId: session.user.id,
      name: name ?? 'Ma liste',
      items: data as object,
    },
  });

  return NextResponse.json({ list }, { status: 201 });
}
