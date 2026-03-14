import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-001';

async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) throw new Error(`Gemini embedding error: ${res.status}`);
  const data = await res.json();
  return data.embedding.values as number[];
}

// GET /api/recipes/semantic-search?q=recette+avec+poulet+et+épices
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ error: 'Requête trop courte (min 3 caractères)' }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Semantic search non configuré (clé Gemini manquante)' }, { status: 503 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '10'), 20);

  try {
    const embedding = await getEmbedding(q);
    const vectorStr = `[${embedding.join(',')}]`;

    // Cosine similarity search via pgvector
    const result = await pool.query(
      `SELECT
        id, title, description, image_url, time_minutes, difficulty,
        cuisine_type, category, tags, like_count, enriched,
        1 - (embedding <=> $1::vector) AS similarity
      FROM recipes
      WHERE is_public = true AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
      [vectorStr, limit]
    );

    const recipes = result.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.image_url,
      timeMinutes: r.time_minutes,
      difficulty: r.difficulty,
      cuisineType: r.cuisine_type,
      category: r.category,
      tags: r.tags,
      likeCount: r.like_count,
      enriched: r.enriched,
      similarity: parseFloat(r.similarity).toFixed(3),
    }));

    return NextResponse.json({ recipes, query: q });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[semantic-search]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
