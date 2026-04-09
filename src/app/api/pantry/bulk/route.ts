import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// POST /api/pantry/bulk
// Body: { names: string[] }
// Adds each ingredient to the pantry. Names can include quantity suffix
// e.g. "Tomates — 500g" → strips to "Tomates" before upsert.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { names } = await req.json();
  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ error: 'names array required' }, { status: 400 });
  }

  // Strip quantity suffix: "Tomates — 500g" → "Tomates"
  const cleaned = [...new Set(
    (names as string[])
      .map((n) => n.split(/\s*[—–-]\s*/)[0].trim())
      .filter(Boolean)
  )];

  const added: string[] = [];
  await Promise.all(
    cleaned.map(async (name) => {
      const ingredient = await prisma.ingredient.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      await prisma.userPantry.upsert({
        where: { userId_ingredientId: { userId: session.user.id, ingredientId: ingredient.id } },
        create: { userId: session.user.id, ingredientId: ingredient.id },
        update: {},
      });
      added.push(name);
    })
  );

  return NextResponse.json({ added, count: added.length });
}
