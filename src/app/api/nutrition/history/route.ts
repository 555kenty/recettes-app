import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// GET /api/nutrition/history?month=YYYY-MM
// Returns meal logs grouped by day for the given month
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
    monthEnd   = new Date(year, month, 0, 23, 59, 59, 999);
  } else {
    const now = new Date();
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const logs = await prisma.mealLog.findMany({
    where: { userId: session.user.id, loggedAt: { gte: monthStart, lte: monthEnd } },
    orderBy: { loggedAt: 'asc' },
  });

  // Group by day (YYYY-MM-DD)
  const days: Record<string, { id: string; name: string; imageUrl: string | null; kcal: number; loggedAt: string }[]> = {};

  for (const log of logs) {
    const day = log.loggedAt.toISOString().split('T')[0];
    if (!days[day]) days[day] = [];
    days[day].push({
      id:       log.id,
      name:     log.name,
      imageUrl: log.imageUrl,
      kcal:     log.kcal,
      loggedAt: log.loggedAt.toISOString(),
    });
  }

  return NextResponse.json({ days });
}
