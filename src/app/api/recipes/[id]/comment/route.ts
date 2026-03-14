import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: recipeId } = await params;

  const comments = await prisma.recipeComment.findMany({
    where: { recipeId, parentId: null },
    orderBy: { createdAt: 'desc' },
    include: {
      // On joint manuellement l'utilisateur via la table User
    },
    take: 50,
  });

  // Enrichir avec les noms d'utilisateurs
  const userIds = [...new Set(comments.map((c) => c.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const enriched = comments.map((c) => ({ ...c, user: userMap[c.userId] ?? null }));

  return NextResponse.json({ comments: enriched });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: recipeId } = await params;
  const { content, parentId } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

  const comment = await prisma.recipeComment.create({
    data: {
      recipeId,
      userId: session.user.id,
      content: content.trim(),
      parentId: parentId ?? null,
    },
  });

  return NextResponse.json({
    comment: { ...comment, user: { id: session.user.id, name: session.user.name, image: session.user.image } },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const commentId = searchParams.get('commentId');
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });

  const comment = await prisma.recipeComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (comment.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.recipeComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
