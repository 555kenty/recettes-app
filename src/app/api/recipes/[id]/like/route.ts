import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;
  const userId = session.user.id;

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });
  if (existing) {
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { likeCount: true } });
    return NextResponse.json({ likeCount: recipe?.likeCount ?? 0, liked: true });
  }

  const [, recipe] = await Promise.all([
    prisma.userFavorite.create({ data: { userId, recipeId } }),
    prisma.recipe.update({ where: { id: recipeId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
  ]);

  return NextResponse.json({ likeCount: recipe.likeCount, liked: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;
  const userId = session.user.id;

  const existing = await prisma.userFavorite.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });
  if (!existing) {
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { likeCount: true } });
    return NextResponse.json({ likeCount: recipe?.likeCount ?? 0, liked: false });
  }

  const [, recipe] = await Promise.all([
    prisma.userFavorite.delete({ where: { userId_recipeId: { userId, recipeId } } }),
    prisma.recipe.update({ where: { id: recipeId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
  ]);

  return NextResponse.json({ likeCount: recipe.likeCount, liked: false });
}
