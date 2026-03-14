import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// POST → ajouter aux favoris, DELETE → retirer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;

  await prisma.userFavorite.upsert({
    where: { userId_recipeId: { userId: session.user.id, recipeId } },
    create: { userId: session.user.id, recipeId },
    update: {},
  });

  return NextResponse.json({ favorited: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;

  await prisma.userFavorite.deleteMany({
    where: { userId: session.user.id, recipeId },
  });

  return NextResponse.json({ favorited: false });
}
