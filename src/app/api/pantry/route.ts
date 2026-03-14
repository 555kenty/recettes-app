import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET → liste du frigo de l'utilisateur
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pantry = await prisma.userPantry.findMany({
    where: { userId: session.user.id },
    include: { ingredient: true },
    orderBy: { addedAt: 'desc' },
  });

  return NextResponse.json({ pantry });
}

// POST { name: string, quantity?: string } → ajouter un ingrédient au frigo
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, quantity } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  // Upsert l'ingrédient dans le catalogue
  const ingredient = await prisma.ingredient.upsert({
    where: { name: name.trim() },
    create: { name: name.trim() },
    update: {},
  });

  // Upsert dans le frigo
  const entry = await prisma.userPantry.upsert({
    where: { userId_ingredientId: { userId: session.user.id, ingredientId: ingredient.id } },
    create: { userId: session.user.id, ingredientId: ingredient.id, quantity: quantity ?? null },
    update: { quantity: quantity ?? null },
    include: { ingredient: true },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
