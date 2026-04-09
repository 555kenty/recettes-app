import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Maps UI label → all DB variants (case-insensitive match applied in query)
const CUISINE_ALIASES: Record<string, string[]> = {
  'Française':      ['Française', 'Francaise', 'French', 'France'],
  'Italian':        ['Italian', 'Italienne', 'Italiana', 'Italy'],
  'Spanish':        ['Spanish', 'Espagnole', 'Española', 'Spain'],
  'British':        ['British', 'Britannique', 'English', 'UK'],
  'Greek':          ['Greek', 'Grecque', 'Greece'],
  'Moroccan':       ['Moroccan', 'Marocaine', 'Morocco'],
  'Africaine':      ['Africaine', 'African', 'Africa'],
  'Haïtienne':      ['Haïtienne', 'Haitienne', 'Haitian', 'Haiti'],
  'Antillaise':     ['Antillaise', 'Caribbean', 'Creole', 'Créole'],
  'Réunionnaise':   ['Réunionnaise', 'Reunionnaise', 'Reunion'],
  'Japanese':       ['Japanese', 'Japonaise', 'Japan'],
  'Chinese':        ['Chinese', 'Chinoise', 'China'],
  'Indian':         ['Indian', 'Indienne', 'India'],
  'Thai':           ['Thai', 'Thaï', 'Thaïlandaise', 'Thailand'],
  'Korean':         ['Korean', 'Coréenne', 'Coreenne', 'Korea'],
  'Vietnamese':     ['Vietnamese', 'Vietnamienne', 'Vietnam'],
  'American':       ['American', 'Américaine', 'Americaine', 'USA'],
  'Mexican':        ['Mexican', 'Mexicaine', 'Mexico'],
  'Jamaican':       ['Jamaican', 'Jamaïcaine', 'Jamaicaine', 'Jamaica'],
  'Middle Eastern': ['Middle Eastern', 'Moyen-Oriental', 'Moyen-Orient', 'Middle East'],
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? '';
  const cuisineType = searchParams.get('cuisineType') ?? '';
  const category = searchParams.get('category') ?? '';
  const difficulty = searchParams.get('difficulty') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '24'));
  const skip = (page - 1) * limit;

  const community = searchParams.get('community') === 'true';
  const mine = searchParams.get('mine') === 'true';

  // ?mine=true : retourne uniquement les recettes de l'utilisateur connecté
  if (mine) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myRecipes = await prisma.recipe.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        timeMinutes: true,
        difficulty: true,
        cuisineType: true,
        isPublic: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ recipes: myRecipes });
  }

  const where: Record<string, unknown> = { isPublic: true };

  // Feed communautaire : uniquement les recettes crées par des utilisateurs
  // (sourceApi = null) ou importées via vidéo (sourceApi = 'video')
  // Exclure les imports en masse : themealdb, spoonacular, ai-generated
  if (community) {
    where.OR = [
      { sourceApi: null },
      { sourceApi: 'video' },
    ];
  }

  if (search) {
    where.title = { contains: search, mode: 'insensitive' };
  }
  if (cuisineType) {
    const aliases = CUISINE_ALIASES[cuisineType] ?? [cuisineType];
    where.cuisineType = { in: aliases };
  }
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
