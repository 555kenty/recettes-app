import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// POST /api/recipes/upload-image
// body: FormData { file: File, recipeId?: string }
// Retourne l'URL Cloudinary
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const recipeId = form.get('recipeId') as string | null;

  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  // Signature pour l'upload Cloudinary (authentifié)
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'cuisineconnect/recipes';

  // Générer la signature HMAC-SHA1
  const crypto = await import('crypto');
  const sigString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(sigString).digest('hex');

  // Upload vers Cloudinary
  const uploadForm = new FormData();
  uploadForm.append('file', file);
  uploadForm.append('api_key', apiKey);
  uploadForm.append('timestamp', String(timestamp));
  uploadForm.append('signature', signature);
  uploadForm.append('folder', folder);
  uploadForm.append('transformation', 'w_800,h_600,c_fill,q_auto,f_auto');

  const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: uploadForm,
  });

  if (!cloudRes.ok) {
    const err = await cloudRes.json().catch(() => ({}));
    return NextResponse.json({ error: 'Cloudinary upload failed', detail: err }, { status: 502 });
  }

  const cloudData = await cloudRes.json();
  const imageUrl: string = cloudData.secure_url;

  // Si un recipeId est fourni, mettre à jour la recette
  if (recipeId) {
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (recipe && recipe.authorId === session.user.id) {
      await prisma.recipe.update({ where: { id: recipeId }, data: { imageUrl } });
    }
  }

  return NextResponse.json({ imageUrl });
}
