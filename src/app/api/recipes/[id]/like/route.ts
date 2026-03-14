import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;

  // Incrémente le compteur public de likes
  const recipe = await prisma.recipe.update({
    where: { id: recipeId },
    data: { likeCount: { increment: 1 } },
    select: { likeCount: true },
  });

  return NextResponse.json({ likeCount: recipe.likeCount });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;

  const recipe = await prisma.recipe.update({
    where: { id: recipeId },
    data: { likeCount: { decrement: 1 } },
    select: { likeCount: true },
  });

  return NextResponse.json({ likeCount: recipe.likeCount });
}
