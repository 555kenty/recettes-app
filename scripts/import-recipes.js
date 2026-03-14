// Script pour importer des recettes depuis Spoonacular vers Supabase
// Usage: node scripts/import-recipes.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Liste des recettes à importer
const RECIPES_TO_IMPORT = [
  { query: 'colombo', cuisine: 'Antillais', count: 20 },
  { query: 'acras', cuisine: 'Antillais', count: 10 },
  { query: 'boudin creole', cuisine: 'Antillais', count: 10 },
  { query: 'chatrou', cuisine: 'Antillais', count: 10 },
  { query: 'blaff', cuisine: 'Antillais', count: 10 },
  { query: 'griot', cuisine: 'Haïtien', count: 15 },
  { query: 'diri djon djon', cuisine: 'Haïtien', count: 10 },
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
    console.error(`Erreur fetch ${query}:`, error.message);
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
    console.error(`Erreur details ${id}:`, error.message);
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
  console.log('🚀 Début de l\'import des recettes...\n');
  
  let totalImported = 0;
  let totalErrors = 0;
  
  for (const { query, cuisine, count } of RECIPES_TO_IMPORT) {
    console.log(`📥 Import ${cuisine}: "${query}" (${count} recettes)...`);
    
    const recipes = await fetchFromSpoonacular(query, count);
    
    for (const recipe of recipes) {
      // Récupérer les détails complets
      const details = await getRecipeDetails(recipe.id);
      if (!details) continue;
      
      // Mapper les ingrédients
      const ingredients = (details.extendedIngredients || []).map(ing => ({
        name: ing.name,
        quantity: `${ing.amount} ${ing.unit}`,
        category: ing.aisle || 'Autres'
      }));
      
      // Mapper les étapes
      const steps = [];
      if (details.analyzedInstructions && details.analyzedInstructions[0]) {
        details.analyzedInstructions[0].steps.forEach(step => {
          steps.push({
            order: step.number,
            description: step.step
          });
        });
      }
      
      // Préparer la recette
      const recipeData = {
        title: details.title,
        description: details.summary?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
        image_url: details.image,
        time_minutes: details.readyInMinutes || 30,
        difficulty: mapDifficulty(details.cuisines?.[0]),
        calories: details.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0,
        cuisine_type: cuisine,
        category: details.dishTypes?.[0] || 'Plat principal',
        ingredients: ingredients,
        steps: steps,
        tags: [...(details.dishTypes || []), ...(details.diets || [])].slice(0, 10),
        source_api: 'spoonacular',
        source_id: String(details.id)
      };
      
      // Insérer dans Supabase
      const { error } = await supabase
        .from('recipes')
        .upsert(recipeData, { onConflict: 'source_id' });
      
      if (error) {
        console.error(`  ❌ Erreur ${details.title}:`, error.message);
        totalErrors++;
      } else {
        console.log(`  ✅ ${details.title}`);
        totalImported++;
      }
      
      // Respecter la limite de rate (1 req/sec pour gratuit)
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('');
  }
  
  console.log('📊 Résumé:');
  console.log(`  ✅ Importées: ${totalImported}`);
  console.log(`  ❌ Erreurs: ${totalErrors}`);
}

// Vérifier les variables d'environnement
if (!SPOONACULAR_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Variables d\'environnement manquantes. Vérifiez .env.local');
  process.exit(1);
}

importRecipes().catch(console.error);
