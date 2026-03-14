import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? '';
  const cuisineType = searchParams.get('cuisineType') ?? '';
  const category = searchParams.get('category') ?? '';
  const difficulty = searchParams.get('difficulty') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '24'));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isPublic: true };

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }
  if (cuisineType) where.cuisineType = cuisineType;
  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        timeMinutes: true,
        difficulty: true,
        calories: true,
        cuisineType: true,
        category: true,
        tags: true,
        likeCount: true,
        viewCount: true,
        servings: true,
        enriched: true,
      },
    }),
    prisma.recipe.count({ where }),
  ]);

  return NextResponse.json({ recipes, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const recipe = await prisma.recipe.create({
    data: {
      title: body.title.trim(),
      description: body.description ?? null,
      cuisineType: body.cuisineType ?? null,
      category: body.category ?? 'Plat principal',
      timeMinutes: body.timeMinutes ?? null,
      difficulty: body.difficulty ?? 'Moyen',
      servings: body.servings ?? null,
      calories: body.calories ?? null,
      isPublic: body.isPublic ?? true,
      tags: body.tags ?? [],
      ingredients: body.ingredients ?? [],
      steps: body.steps ?? [],
      language: body.language ?? 'fr',
      authorId: session.user.id,
      sourceApi: 'user',
      enriched: false,
      quality: 0,
    },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
