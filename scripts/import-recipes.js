// Script pour importer des recettes depuis Spoonacular
// Usage: node scripts/import-recipes.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

const RECIPES_TO_IMPORT = [
  { query: 'colombo', cuisine: 'Antillais', count: 20 },
  { query: 'acras', cuisine: 'Antillais', count: 10 },
  { query: 'boudin creole', cuisine: 'Antillais', count: 10 },
  { query: 'griot', cuisine: 'Haïtien', count: 15 },
  { query: 'soup joumou', cuisine: 'Haïtien', count: 10 },
  { query: 'jollof rice', cuisine: 'Africain', count: 15 },
  { query: 'tagine', cuisine: 'Marocain', count: 15 },
  { query: 'couscous', cuisine: 'Maghrebin', count: 20 },
  { query: 'carbonara', cuisine: 'Italien', count: 15 },
  { query: 'sushi', cuisine: 'Japonais', count: 15 },
  { query: 'pad thai', cuisine: 'Thaïlandais', count: 15 },
  { query: 'tacos', cuisine: 'Mexicain', count: 20 },
];

async function fetchFromSpoonacular(query, number = 10) {
  try {
    const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=${number}&addRecipeInformation=true&fillIngredients=true&apiKey=${SPOONACULAR_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`❌ Erreur fetch ${query}:`, error.message);
    return [];
  }
}

async function getRecipeDetails(id) {
  try {
    const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${SPOONACULAR_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`❌ Erreur details ${id}:`, error.message);
    return null;
  }
}

function mapDifficulty(spoonacularDifficulty) {
  if (!spoonacularDifficulty) return 'Moyen';
  const d = spoonacularDifficulty.toLowerCase();
  if (d.includes('easy')) return 'Facile';
  if (d.includes('hard')) return 'Difficile';
  return 'Moyen';
}

async function importRecipes() {
  console.log('🚀 Import des recettes vers Prisma/Supabase...\n');
  
  let totalImported = 0;
  let totalErrors = 0;
  
  for (const { query, cuisine, count } of RECIPES_TO_IMPORT) {
    console.log(`📥 ${cuisine} - "${query}" (${count})...`);
    
    const recipes = await fetchFromSpoonacular(query, count);
    
    for (const recipe of recipes) {
      const details = await getRecipeDetails(recipe.id);
      if (!details) continue;
      
      const ingredients = (details.extendedIngredients || []).map(ing => ({
        name: ing.name,
        quantity: `${ing.amount} ${ing.unit}`,
        category: ing.aisle || 'Autres'
      }));
      
      const steps = [];
      if (details.analyzedInstructions?.[0]) {
        details.analyzedInstructions[0].steps.forEach(step => {
          steps.push({ order: step.number, description: step.step });
        });
      }
      
      try {
        await prisma.recipe.upsert({
          where: { sourceId: String(details.id) },
          update: {},
          create: {
            title: details.title,
            description: details.summary?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
            imageUrl: details.image,
            timeMinutes: details.readyInMinutes || 30,
            difficulty: mapDifficulty(details.cuisines?.[0]),
            calories: details.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0,
            cuisineType: cuisine,
            category: details.dishTypes?.[0] || 'Plat principal',
            ingredients: ingredients,
            steps: steps,
            tags: [...(details.dishTypes || []), ...(details.diets || [])].slice(0, 10),
            sourceApi: 'spoonacular',
            sourceId: String(details.id)
          }
        });
        console.log(`  ✅ ${details.title}`);
        totalImported++;
      } catch (error) {
        console.error(`  ❌ ${details.title}:`, error.message);
        totalErrors++;
      }
      
      // Rate limiting: 1 req/sec
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log(`  ✅ Importées: ${totalImported}`);
  console.log(`  ❌ Erreurs: ${totalErrors}`);
}

if (!SPOONACULAR_API_KEY) {
  console.error('❌ SPOONACULAR_API_KEY manquante');
  process.exit(1);
}

importRecipes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
