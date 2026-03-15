import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      recipe: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          timeMinutes: true,
          difficulty: true,
          cuisineType: true,
          likeCount: true,
        },
      },
    },
  });

  return NextResponse.json({ favorites: favorites.map((f) => f.recipe) });
}
