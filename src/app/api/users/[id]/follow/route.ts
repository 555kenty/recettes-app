import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// POST → suivre un utilisateur
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: followingId } = await params;
  const followerId = session.user.id;

  if (followerId === followingId) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.userFollow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    }),
    prisma.userProfile.upsert({
      where: { id: followerId },
      create: { id: followerId, followingCount: 1 },
      update: { followingCount: { increment: 1 } },
    }),
    prisma.userProfile.upsert({
      where: { id: followingId },
      create: { id: followingId, followersCount: 1 },
      update: { followersCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ following: true });
}

// DELETE → ne plus suivre un utilisateur
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: followingId } = await params;
  const followerId = session.user.id;

  const existing = await prisma.userFollow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (!existing) return NextResponse.json({ following: false });

  await prisma.$transaction([
    prisma.userFollow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    }),
    prisma.userProfile.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    }),
    prisma.userProfile.update({
      where: { id: followingId },
      data: { followersCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ following: false });
}
