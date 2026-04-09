import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { items } = await req.json();

  const list = await prisma.shoppingList.findUnique({ where: { id } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (list.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updated = await prisma.shoppingList.update({
    where: { id },
    data: { items: items as object },
  });

  return NextResponse.json({ list: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const list = await prisma.shoppingList.findUnique({ where: { id } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (list.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.shoppingList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
