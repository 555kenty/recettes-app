#!/usr/bin/env node
/**
 * Génère des synonymes pour les ingrédients en DB via Gemini/Kimi
 * Utilise les synonymes pour améliorer le matching frigo → recettes
 * Usage : node scripts/generate-synonyms.js [--dry-run] [--limit=N] [--batch=5]
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const OpenAI = require('openai').default;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : undefined;
const BATCH_ARG = process.argv.find((a) => a.startsWith('--batch='));
const BATCH_SIZE = BATCH_ARG ? parseInt(BATCH_ARG.split('=')[1]) : 10;

// Provider config
const PROVIDER = process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini';
const CLIENT_CONFIG = PROVIDER === 'gemini'
  ? {
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    }
  : {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    };
const MODEL = PROVIDER === 'gemini' ? 'models/gemini-2.5-flash' : 'moonshotai/kimi-k2.5';

const client = new OpenAI(CLIENT_CONFIG);

let processed = 0;
let synonymsCreated = 0;
let errors = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateSynonyms(ingredientNames) {
  const prompt = `Pour chaque ingrédient de la liste suivante, génère des synonymes courants en cuisine française.
Les synonymes incluent : variantes orthographiques, pluriels, abréviations, noms régionaux, noms communs vs scientifiques.
Exemples : "tomate" → ["tomates", "tomate cerise", "tomates cerises", "tomate roma"]

Réponds UNIQUEMENT avec un JSON valide de ce format :
{
  "ingrédient1": ["synonyme1", "synonyme2", "synonyme3"],
  "ingrédient2": ["synonyme1", "synonyme2"]
}

Ingrédients :
${ingredientNames.map((n) => `- ${n}`).join('\n')}`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || '';
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('JSON invalide dans la réponse');
  return JSON.parse(jsonMatch[0]);
}

async function processBatch(ingredients) {
  const names = ingredients.map((i) => i.name);

  let synonymMap;
  try {
    synonymMap = await generateSynonyms(names);
  } catch (err) {
    console.error(`  ✗ Erreur IA pour le batch: ${err.message}`);
    errors++;
    return;
  }

  for (const ingredient of ingredients) {
    const synonyms = synonymMap[ingredient.name] || [];
    if (!synonyms.length) continue;

    if (DRY_RUN) {
      console.log(`  [dry-run] ${ingredient.name} → ${synonyms.join(', ')}`);
      continue;
    }

    for (const synonym of synonyms) {
      const normalized = synonym.trim().toLowerCase().slice(0, 100);
      if (!normalized || normalized === ingredient.name) continue;
      try {
        await prisma.ingredientSynonym.upsert({
          where: { synonym: normalized },
          create: { ingredientId: ingredient.id, synonym: normalized },
          update: {},
        });
        synonymsCreated++;
      } catch {
        // Conflict with another ingredient's synonym — skip
      }
    }
    processed++;
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.error('ERREUR: GEMINI_API_KEY ou OPENROUTER_API_KEY requis');
    process.exit(1);
  }

  console.log(`=== Génération de synonymes (provider: ${PROVIDER}, model: ${MODEL}) ===`);
  if (DRY_RUN) console.log('Mode DRY-RUN');

  // Fetch ingredients that don't have synonyms yet
  const ingredients = await prisma.ingredient.findMany({
    where: { synonyms: { none: {} } },
    ...(LIMIT ? { take: LIMIT } : {}),
    orderBy: { name: 'asc' },
  });

  console.log(`${ingredients.length} ingrédients sans synonymes`);

  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ingredients.length / BATCH_SIZE)} (${batch.map((b) => b.name).join(', ')})... `);

    await processBatch(batch);
    console.log('✓');

    if (i + BATCH_SIZE < ingredients.length) {
      await sleep(2000);
    }
  }

  console.log('\n=== Résumé ===');
  console.log(`✓ Ingrédients traités : ${processed}`);
  console.log(`✓ Synonymes créés     : ${synonymsCreated}`);
  console.log(`✗ Erreurs             : ${errors}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
