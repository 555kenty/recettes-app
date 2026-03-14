// Script pour importer des recettes depuis Spoonacular vers Supabase
// À exécuter avec : node scripts/import-recipes.js

const RECIPES_TO_IMPORT = [
  // Antillais / Guadeloupe / Martinique
  { query: 'colombo', cuisine: 'Antillais', count: 50 },
  { query: 'acras', cuisine: 'Antillais', count: 30 },
  { query: 'boudin creole', cuisine: 'Antillais', count: 30 },
  { query: 'chatrou', cuisine: 'Antillais', count: 20 },
  { query: 'tartane', cuisine: 'Antillais', count: 20 },
  { query: 'blaff', cuisine: 'Antillais', count: 20 },
  { query: 'dombrés', cuisine: 'Antillais', count: 20 },
  { query: 'fricassée', cuisine: 'Antillais', count: 20 },
  
  // Haïtien
  { query: 'griot', cuisine: 'Haïtien', count: 30 },
  { query: 'diri ak djon djon', cuisine: 'Haïtien', count: 20 },
  { query: 'tasso', cuisine: 'Haïtien', count: 20 },
  { query: 'pate kode', cuisine: 'Haïtien', count: 20 },
  { query: 'soup joumou', cuisine: 'Haïtien', count: 20 },
  
  // Africain
  { query: 'jollof rice', cuisine: 'Africain', count: 30 },
  { query: 'thieboudienne', cuisine: 'Africain', count: 30 },
  { query: 'tagine', cuisine: 'Marocain', count: 30 },
  { query: 'couscous', cuisine: 'Maghrebin', count: 40 },
  { query: 'yassa', cuisine: 'Africain', count: 20 },
  { query: 'mafe', cuisine: 'Africain', count: 20 },
  { query: 'alloco', cuisine: 'Africain', count: 20 },
  { query: 'saka saka', cuisine: 'Africain', count: 20 },
  
  // Français
  { query: 'beef bourguignon', cuisine: 'Français', count: 30 },
  { query: 'coq au vin', cuisine: 'Français', count: 30 },
  { query: 'ratatouille', cuisine: 'Français', count: 30 },
  { query: 'cassoulet', cuisine: 'Français', count: 30 },
  { query: 'bouillabaisse', cuisine: 'Français', count: 20 },
  { query: 'tarte tatin', cuisine: 'Français', count: 20 },
  
  // Italien
  { query: 'pasta carbonara', cuisine: 'Italien', count: 30 },
  { query: 'pizza margherita', cuisine: 'Italien', count: 30 },
  { query: 'risotto', cuisine: 'Italien', count: 30 },
  { query: 'osso buco', cuisine: 'Italien', count: 20 },
  { query: 'tiramisu', cuisine: 'Italien', count: 20 },
  
  // Espagnol / Latino
  { query: 'paella', cuisine: 'Espagnol', count: 30 },
  { query: 'tacos', cuisine: 'Mexicain', count: 40 },
  { query: 'ceviche', cuisine: 'Péruvien', count: 30 },
  { query: 'empanadas', cuisine: 'Argentin', count: 30 },
  { query: 'feijoada', cuisine: 'Brésilien', count: 20 },
  
  // Asiatique
  { query: 'sushi', cuisine: 'Japonais', count: 30 },
  { query: 'ramen', cuisine: 'Japonais', count: 30 },
  { query: 'pad thai', cuisine: 'Thaïlandais', count: 30 },
  { query: 'pho', cuisine: 'Vietnamien', count: 30 },
  { query: 'dim sum', cuisine: 'Chinois', count: 30 },
  { query: 'bibimbap', cuisine: 'Coréen', count: 30 },
  { query: 'butter chicken', cuisine: 'Indien', count: 30 },
  { query: 'curry', cuisine: 'Indien', count: 40 },
  
  // Américain
  { query: 'burger', cuisine: 'Américain', count: 30 },
  { query: 'bbq ribs', cuisine: 'Américain', count: 30 },
  { query: 'mac and cheese', cuisine: 'Américain', count: 20 },
  { query: 'fried chicken', cuisine: 'Américain', count: 30 },
  { query: 'pancakes', cuisine: 'Américain', count: 20 },
  
  // Moyen-Orient
  { query: 'hummus', cuisine: 'Libanais', count: 20 },
  { query: 'falafel', cuisine: 'Libanais', count: 20 },
  { query: 'shawarma', cuisine: 'Libanais', count: 20 },
  { query: 'kebab', cuisine: 'Turc', count: 30 },
  { query: 'biryani', cuisine: 'Pakistanais', count: 30 },
  
  // Healthy / Rapide
  { query: 'salad bowl', cuisine: 'Healthy', count: 40 },
  { query: 'smoothie bowl', cuisine: 'Healthy', count: 20 },
  { query: 'avocado toast', cuisine: 'Healthy', count: 20 },
  { query: 'poke bowl', cuisine: 'Healthy', count: 20 },
  { query: 'quinoa salad', cuisine: 'Healthy', count: 30 },
];

// Total estimé : 1000+ recettes variées
// Spoonacular : 150 requêtes/jour gratuites
// Donc il faudra ~7 jours pour tout importer ou utiliser un plan payant ($10/mois)

console.log('Plan d\'importation :');
console.log('====================');
let total = 0;
RECIPES_TO_IMPORT.forEach(item => {
  total += item.count;
  console.log(`${item.cuisine}: ${item.count} recettes (${item.query})`);
});
console.log('====================');
console.log(`Total: ${total} recettes`);
console.log(`Jours nécessaires (150 req/jour): ${Math.ceil(total / 150)} jours`);
