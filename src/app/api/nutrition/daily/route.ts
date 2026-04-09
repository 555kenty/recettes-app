import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { computeTDEE } from '@/lib/tdee';

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // Fetch today's meal logs
  const logs = await prisma.mealLog.findMany({
    where: { userId, loggedAt: { gte: todayStart, lte: todayEnd } },
    orderBy: { loggedAt: 'desc' },
  });

  // Sum consumed macros
  const consumed = logs.reduce(
    (acc, l) => ({
      kcal:     acc.kcal     + l.kcal,
      proteins: acc.proteins + l.proteins,
      fats:     acc.fats     + l.fats,
      carbs:    acc.carbs    + l.carbs,
    }),
    { kcal: 0, proteins: 0, fats: 0, carbs: 0 },
  );

  // Get user profile for TDEE
  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  const tdee = computeTDEE({
    age:           (profile as { age?: number | null }           | null)?.age           ?? null,
    weight:        (profile as { weight?: number | null }        | null)?.weight        ?? null,
    height:        (profile as { height?: number | null }        | null)?.height        ?? null,
    gender:        (profile as { gender?: string | null }        | null)?.gender        ?? null,
    activityLevel: (profile as { activityLevel?: string | null } | null)?.activityLevel ?? null,
    goal:          profile?.goal ?? null,
  });

  return NextResponse.json({
    consumed: {
      kcal:     Math.round(consumed.kcal),
      proteins: Math.round(consumed.proteins * 10) / 10,
      fats:     Math.round(consumed.fats     * 10) / 10,
      carbs:    Math.round(consumed.carbs    * 10) / 10,
    },
    target:        { kcal: tdee.tdee, proteins: tdee.protein, fats: tdee.fat, carbs: tdee.carbs },
    tdeeBreakdown: { proteinKcal: tdee.proteinKcal, fatKcal: tdee.fatKcal, carbsKcal: tdee.carbsKcal },
    logs,
    profileComplete: !!(
      profile &&
      (profile as { age?: number | null }).age &&
      (profile as { weight?: number | null }).weight &&
      (profile as { height?: number | null }).height &&
      (profile as { gender?: string | null }).gender
    ),
  });
}
