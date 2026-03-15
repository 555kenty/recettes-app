import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });

  const [recipe, favorite] = await Promise.all([
    prisma.recipe.findUnique({ where: { id } }),
    session ? prisma.userFavorite.findUnique({
      where: { userId_recipeId: { userId: session.user.id, recipeId: id } },
    }) : Promise.resolve(null),
  ]);

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.recipe.update({ where: { id }, data: { viewCount: { increment: 1 } } });

  return NextResponse.json({ ...recipe, liked: !!favorite });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const recipe = await prisma.recipe.findUnique({ where: { id } });

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (recipe.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await prisma.recipe.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      ingredients: body.ingredients,
      steps: body.steps,
      timeMinutes: body.timeMinutes,
      difficulty: body.difficulty,
      servings: body.servings,
      isPublic: body.isPublic,
      tags: body.tags,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (recipe.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
