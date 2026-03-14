import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/ingredients/search?q=tomate → autocomplete
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) return NextResponse.json({ ingredients: [] });

  const ingredients = await prisma.ingredient.findMany({
    where: { name: { contains: q, mode: 'insensitive' } },
    select: { id: true, name: true, category: true, imageUrl: true, caloriesPer100g: true },
    take: 10,
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ ingredients });
}
