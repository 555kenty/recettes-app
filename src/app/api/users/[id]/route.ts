import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/users/[id] → profil public d'un utilisateur
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      profile: {
        select: {
          bio: true,
          isPublic: true,
          followersCount: true,
          followingCount: true,
          goal: true,
          age: true,
          weight: true,
          height: true,
          gender: true,
          activityLevel: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.profile && !user.profile.isPublic) {
    return NextResponse.json({ error: 'Profile is private' }, { status: 403 });
  }

  return NextResponse.json({ user });
}

// PUT /api/users/[id] → mettre à jour son propre profil
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (session.user.id !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { bio, goal, isPublic, age, weight, height, gender, activityLevel } = await req.json();

  const profile = await prisma.userProfile.upsert({
    where: { id },
    create: { id, bio, goal, isPublic, age, weight, height, gender, activityLevel },
    update: { bio, goal, isPublic, age, weight, height, gender, activityLevel },
  });

  return NextResponse.json({ profile });
}
