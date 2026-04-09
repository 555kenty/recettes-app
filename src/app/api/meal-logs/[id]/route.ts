import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// DELETE /api/meal-logs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const log = await prisma.mealLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (log.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.mealLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
