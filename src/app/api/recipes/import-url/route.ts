import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import OpenAI from 'openai';

const execAsync = promisify(exec);

// Supported URL patterns
const SUPPORTED_PATTERNS = [
  /youtube\.com\/watch\?v=[\w-]+/,
  /youtu\.be\/[\w-]+/,
  /tiktok\.com\/@[\w.]+\/video\/\d+/,
  /instagram\.com\/reels?\/[\w-]+/,
];

function isSupportedUrl(url: string): boolean {
  return SUPPORTED_PATTERNS.some((p) => p.test(url));
}

async function transcribeAudio(audioPath: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error('No transcription API key available');
  }

  // Use Gemini via OpenAI-compatible endpoint if no OpenAI key
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY!,
    baseURL: process.env.OPENAI_API_KEY
      ? undefined
      : 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });

  const audioFile = await readFile(audioPath);
  const blob = new Blob([audioFile], { type: 'audio/mp3' });
  const file = new File([blob], 'audio.mp3', { type: 'audio/mp3' });

  const result = await client.audio.transcriptions.create({
    model: process.env.OPENAI_API_KEY ? 'whisper-1' : 'whisper-1',
    file,
    language: 'fr',
  });

  return result.text;
}

async function extractRecipeFromTranscription(
  transcription: string,
  videoUrl: string
): Promise<{ title: string; description: string; ingredients: object[]; steps: object[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('No AI API key available');

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.GEMINI_API_KEY
      ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
      : 'https://openrouter.ai/api/v1',
  });

  const model = process.env.GEMINI_API_KEY
    ? 'models/gemini-2.5-flash'
    : 'moonshotai/kimi-k2.5';

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: `Tu es un extracteur de recettes expert. À partir de la transcription d'une vidéo culinaire, extrais la recette complète.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication.
Format exact :
{
  "title": "Nom de la recette",
  "description": "Description courte appétissante",
  "cuisineType": "Type de cuisine ou null",
  "category": "Entrée|Plat principal|Dessert|Autre",
  "timeMinutes": 30,
  "difficulty": "Facile|Moyen|Difficile",
  "servings": 4,
  "ingredients": [
    {"name": "nom ingrédient", "quantity": "quantité ou null", "unit": "unité ou null"}
  ],
  "steps": [
    {"order": 1, "description": "étape détaillée", "duration_minutes": null, "tip": null}
  ]
}`,
      },
      {
        role: 'user',
        content: `Voici la transcription d'une vidéo culinaire :\n\n${transcription}\n\nExtrait la recette en JSON.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? '';
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) return null;

  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL requise' }, { status: 400 });
  }

  if (!isSupportedUrl(url)) {
    return NextResponse.json(
      { error: 'URL non supportée. Formats acceptés : YouTube, TikTok, Instagram Reels.' },
      { status: 400 }
    );
  }

  // Check if yt-dlp is available
  try {
    await execAsync('yt-dlp --version');
  } catch {
    return NextResponse.json(
      { error: 'yt-dlp non installé sur le serveur.' },
      { status: 503 }
    );
  }

  const tmpDir = tmpdir();
  const audioPath = join(tmpDir, `recipe-${Date.now()}.mp3`);

  try {
    // Download audio only with yt-dlp
    await execAsync(
      `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${audioPath}" "${url}" --no-playlist --max-filesize 50m`,
      { timeout: 120_000 }
    );

    // Transcribe audio
    const transcription = await transcribeAudio(audioPath);
    if (!transcription.trim()) {
      return NextResponse.json({ error: 'Impossible de transcrire la vidéo.' }, { status: 422 });
    }

    // Extract recipe from transcription
    const extracted = await extractRecipeFromTranscription(transcription, url);
    if (!extracted) {
      return NextResponse.json({ error: 'Impossible d\'extraire une recette de cette vidéo.' }, { status: 422 });
    }

    // Save to DB
    const recipe = await prisma.recipe.create({
      data: {
        title: extracted.title,
        description: extracted.description ?? null,
        ingredients: (extracted.ingredients ?? []) as object[],
        steps: (extracted.steps ?? []) as object[],
        videoUrl: url,
        sourceApi: 'video',
        authorId: session.user.id,
        isPublic: false,
        language: 'fr',
      },
    });

    return NextResponse.json({ recipe, transcription }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[import-url]', message);
    return NextResponse.json({ error: `Erreur lors du traitement : ${message}` }, { status: 500 });
  } finally {
    // Cleanup temp file
    try { await unlink(audioPath); } catch { /* ignore */ }
  }
}
