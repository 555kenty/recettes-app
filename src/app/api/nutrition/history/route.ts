import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/nutrition/history?month=YYYY-MM
// Returns history entries grouped by day for the given month
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get('month'); // e.g. "2026-04"

  let monthStart: Date;
  let monthEnd: Date;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [year, month] = monthParam.split('-').map(Number);
    monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  } else {
    const now = new Date();
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const entries = await prisma.userHistory.findMany({
    where: { userId: session.user.id, viewedAt: { gte: monthStart, lte: monthEnd } },
    include: {
      recipe: { select: { id: true, title: true, imageUrl: true, calories: true } },
    },
    orderBy: { viewedAt: 'asc' },
  });

  // Group by day (YYYY-MM-DD) and deduplicate by recipeId per day
  const days: Record<string, { recipeId: string; recipeName: string; recipeImage: string | null; calories: number | null; viewedAt: string }[]> = {};

  for (const entry of entries) {
    const day = entry.viewedAt.toISOString().split('T')[0];
    if (!days[day]) days[day] = [];
    // deduplicate same recipe on same day
    if (!days[day].some((e) => e.recipeId === entry.recipeId)) {
      days[day].push({
        recipeId: entry.recipeId,
        recipeName: entry.recipe.title,
        recipeImage: entry.recipe.imageUrl,
        calories: entry.recipe.calories,
        viewedAt: entry.viewedAt.toISOString(),
      });
    }
  }

  return NextResponse.json({ days });
}
