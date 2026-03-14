// Script d'enrichissement IA des recettes
// Usage:
//   node scripts/enrich-recipes.js               → enrichit par batch de 10
//   node scripts/enrich-recipes.js --limit=3     → limite à 3 recettes
//   node scripts/enrich-recipes.js --dry-run     → affiche sans écrire en DB
//   node scripts/enrich-recipes.js --provider=gemini  (défaut)
//   node scripts/enrich-recipes.js --provider=kimi

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const OpenAI = require('openai').default;

// ============================================
// CONFIG
// ============================================

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 50;
const providerArg = args.find((a) => a.startsWith('--provider='));
const PROVIDER = providerArg ? providerArg.split('=')[1] : 'gemini';
const BATCH_SIZE = 5;

const PROVIDERS = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'models/gemini-2.5-flash',
  },
  // OpenRouter — accès à Kimi K2.5 + 300+ modèles (clé sur openrouter.ai)
  // Usage : node scripts/enrich-recipes.js --provider=kimi-k2
  'kimi-k2': {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'moonshotai/kimi-k2.5',
  },
  // Moonshot legacy (clé plateforme.moonshot.cn)
  kimi: {
    apiKey: process.env.KIMI_API_KEY,
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-128k',
  },
};

// ============================================
// PRISMA
// ============================================

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================
// PROMPT D'ENRICHISSEMENT
// ============================================

function buildPrompt(recipe) {
  return `Tu es un chef cuisinier expert et pédagogue. Voici une recette importée automatiquement qui peut être incomplète ou en anglais :

Titre: ${recipe.title}
Cuisine: ${recipe.cuisineType || 'Internationale'}
Catégorie: ${recipe.category || 'Plat principal'}
Ingrédients actuels: ${JSON.stringify(recipe.ingredients)}
Étapes actuelles: ${JSON.stringify(recipe.steps)}

Ta mission est d'améliorer cette recette pour qu'elle soit parfaite en FRANÇAIS :

1. TRADUCTION : Si le titre ou les étapes sont en anglais, traduis tout en français naturel.

2. ÉTAPES : Détaille chaque étape avec précision. Chaque étape = une seule action claire.
   - Indique toujours le temps (ex: "pendant 3-4 minutes")
   - Indique la température ou le niveau de feu (ex: "à feu moyen-vif", "à 180°C")
   - Langue simple, directe (niveau lycéen suffit)
   - Maximum 3 phrases par étape
   - Ajoute une astuce de chef si pertinent (champ "tip")

3. INGRÉDIENTS : Complète les ingrédients manquants (sel, poivre, huile, etc.)
   - Quantités précises en unités claires
   - Noms en français

4. QUALITÉ : Score 0-100 basé sur la complétude de la recette originale avant enrichissement.

Réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans texte avant/après :
{
  "title": "Titre en français",
  "description": "Description courte et appétissante en 2 phrases.",
  "steps": [
    {
      "order": 1,
      "description": "Description complète.",
      "duration_minutes": 5,
      "tip": null
    }
  ],
  "ingredients": [
    {
      "name": "Nom en français",
      "quantity": "200",
      "unit": "g",
      "category": "Légumes"
    }
  ],
  "quality": 75
}`;
}

// ============================================
// ENRICHISSEMENT
// ============================================

async function enrichRecipe(client, model, recipe) {
  const prompt = buildPrompt(recipe);

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 8192,
  });

  const raw = response.choices[0].message.content.trim();

  // Nettoyer les blocs markdown si l'IA en ajoute quand même
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  return JSON.parse(cleaned);
}

async function processRecipe(client, model, recipe, index, total) {
  process.stdout.write(`  [${index}/${total}] ${recipe.title}... `);

  try {
    const enriched = await enrichRecipe(client, model, recipe);

    if (!isDryRun) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          title: enriched.title || recipe.title,
          description: enriched.description || null,
          steps: enriched.steps || recipe.steps,
          ingredients: enriched.ingredients || recipe.ingredients,
          quality: enriched.quality || 50,
          enriched: true,
          language: 'fr',
        },
      });
    }

    process.stdout.write(`✅ (qualité: ${enriched.quality}/100)\n`);
    return { success: true };
  } catch (err) {
    process.stdout.write(`❌ ${err.message}\n`);
    return { success: false, error: err.message, recipeId: recipe.id };
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const config = PROVIDERS[PROVIDER];
  if (!config?.apiKey) {
    console.error(`❌ Clé API manquante pour le provider "${PROVIDER}". Vérifie ton .env.`);
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

  console.log(`🤖 Enrichissement IA — provider: ${PROVIDER} (${config.model})`);
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (pas d\'écriture en DB)' : 'PRODUCTION'}`);
  console.log(`🔢 Limite: ${LIMIT} recettes\n`);

  // Récupérer les recettes non enrichies
  const recipes = await prisma.recipe.findMany({
    where: { enriched: false },
    take: LIMIT,
    orderBy: { createdAt: 'asc' },
  });

  if (recipes.length === 0) {
    console.log('✅ Toutes les recettes sont déjà enrichies !');
    return;
  }

  console.log(`📦 ${recipes.length} recettes à enrichir\n`);

  const errors = [];
  let successCount = 0;

  // Traitement par batch pour éviter les timeouts
  for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
    const batch = recipes.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const recipe = batch[j];
      const result = await processRecipe(client, config.model, recipe, i + j + 1, recipes.length);

      if (result.success) {
        successCount++;
      } else {
        errors.push(result);
      }

      // Rate limiting : pause entre chaque requête
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Pause entre les batches
    if (i + BATCH_SIZE < recipes.length) {
      console.log(`\n  ⏳ Pause batch...\n`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log('\n📊 Résumé:');
  console.log(`  ✅ Enrichies  : ${successCount}`);
  console.log(`  ❌ Erreurs    : ${errors.length}`);

  if (errors.length > 0) {
    const fs = require('fs');
    const errorFile = 'scripts/enrichment-errors.json';
    fs.writeFileSync(errorFile, JSON.stringify(errors, null, 2));
    console.log(`  📄 Erreurs sauvegardées dans ${errorFile}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
