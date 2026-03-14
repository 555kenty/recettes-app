'use client';

import { useState, useEffect } from 'react';
import { Search, Clock, Users, Heart, X, ChefHat } from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  emoji: string;
  description: string;
  image: string;
  time: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
}

const recipes: Recipe[] = [
  {
    id: 1,
    title: 'Pâtes Bolognaise',
    emoji: '🍝',
    description: 'Un classique italien réconfortant et facile.',
    image: 'https://images.unsplash.com/photo-1626844131082-256783844137?w=800',
    time: 35,
    difficulty: 1,
    servings: 4,
    tags: ['pâtes', 'italien', 'viande', 'rapide'],
    ingredients: ['400g pâtes', '300g viande hachée', '1 oignon', '2 gousses ail', '400g tomates', 'Parmesan'],
    steps: ['Faire revenir oignon et ail', 'Ajouter viande, faire dorer', 'Ajouter tomates, mijoter 20min', 'Cuire pâtes, mélanger'],
  },
  {
    id: 2,
    title: 'Poulet Curry Coco',
    emoji: '🍗',
    description: 'Un plat exotique crémeux et parfumé.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800',
    time: 30,
    difficulty: 1,
    servings: 4,
    tags: ['poulet', 'asiatique', 'rapide'],
    ingredients: ['300g riz', '2 filets poulet', '400ml lait de coco', '2 càs curry', 'Oignon', 'Coriandre'],
    steps: ['Cuire le riz', 'Faire revenir poulet', 'Ajouter curry et lait de coco', 'Mijoter 15min', 'Servir sur riz'],
  },
  {
    id: 3,
    title: 'Œufs Brouillés',
    emoji: '🍳',
    description: 'Le petit-déj parfait, rapide et délicieux.',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?w=800',
    time: 7,
    difficulty: 1,
    servings: 2,
    tags: ['petit-déj', 'œufs', 'rapide'],
    ingredients: ['4 œufs', '20g beurre', '2 càs crème fraîche', 'Sel, poivre'],
    steps: ['Battre les œufs', 'Faire fondre beurre', 'Cuire à feu doux en remuant', 'Ajouter crème à la fin'],
  },
  {
    id: 4,
    title: 'Pizza Pita',
    emoji: '🍕',
    description: 'Une pizza maison en 15 minutes chrono !',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    time: 15,
    difficulty: 1,
    servings: 2,
    tags: ['pizza', 'rapide', 'snack'],
    ingredients: ['2 pains pita', 'Sauce tomate', '100g mozzarella', 'Jambon', 'Champignons'],
    steps: ['Préchauffer four à 200°C', 'Étaler sauce sur pains', 'Ajouter garnitures', 'Enfourner 10min'],
  },
  {
    id: 5,
    title: 'Wrap Poulet',
    emoji: '🌯',
    description: 'Un repas frais et healthy en 5 minutes.',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
    time: 5,
    difficulty: 1,
    servings: 1,
    tags: ['wrap', 'healthy', 'rapide', 'poulet'],
    ingredients: ['1 tortilla', '100g poulet', 'Salade, tomate', 'Sauce'],
    steps: ['Tartiner sauce', 'Ajouter poulet et légumes', 'Rouler serré'],
  },
  {
    id: 6,
    title: 'Riz Frit',
    emoji: '🍚',
    description: 'Un plat asiatique complet et healthy.',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb74b?w=800',
    time: 25,
    difficulty: 2,
    servings: 2,
    tags: ['riz', 'asiatique', 'healthy'],
    ingredients: ['300g riz cuit', '2 œufs', 'Légumes', 'Sauce soja'],
    steps: ['Faire omelette', 'Sauter légumes', 'Ajouter riz et sauce', 'Mélanger'],
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (id: number) => {
    const newFavs = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const filteredRecipes = recipes.filter(recipe => {
    if (showFavorites) return favorites.includes(recipe.id);
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.tags.some(t => t.includes(query)) ||
      recipe.ingredients.some(i => i.toLowerCase().includes(query))
    );
  });

  const getDifficultyLabel = (d: number) => {
    const labels = ['Facile', 'Moyen', 'Difficile'];
    const colors = ['text-green-500', 'text-yellow-500', 'text-red-500'];
    return { label: labels[d - 1], color: colors[d - 1] };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-green-500 rounded-xl flex items-center justify-center text-2xl">
              🍳
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Recettes</h1>
              <p className="text-xs text-gray-500">Faciles</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`p-2 rounded-full transition-colors ${showFavorites ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'}`}
          >
            <Heart className={`w-6 h-6 ${showFavorites ? 'fill-current' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-6xl md:text-7xl mb-4 animate-bounce">👨‍🍳</div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">
              Recettes Faciles
            </span>
          </h1>
          
          <p className="text-gray-600 text-lg mb-6">
            Qu'est-ce que tu as dans le frigo ? 🍝
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowFavorites(false);
              }}
              placeholder="Ex: pâtes, œufs, poulet..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-lg transition-colors"
            />
            
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['🍝 Pâtes', '🍗 Poulet', '🍳 Rapide', '🥗 Healthy', '🍕 Pizza'].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSearchQuery(tag.split(' ')[1].toLowerCase());
                setShowFavorites(false);
              }}
              className="px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow font-medium text-gray-700"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <p className="text-center text-gray-500 mb-6">
          {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? 's' : ''}
          {showFavorites && ' dans tes favoris'}
        </p>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => {
            const diff = getDifficultyLabel(recipe.difficulty);
            const isFav = favorites.includes(recipe.id);
            
            return (
              <div
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className="bg-white rounded-3xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-48">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium">
                    {recipe.emoji}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recipe.id);
                    }}
                    className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isFav ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-sm bg-black/30 backdrop-blur px-2 py-1 rounded-full">
                    <Clock className="w-4 h-4" />
                    {recipe.time} min
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-1">{recipe.title}</h3>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      {recipe.servings} pers
                    </div>
                    
                    <div className={`flex items-center gap-1 ${diff.color}`}>
                      <ChefHat className="w-4 h-4" />
                      {diff.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedRecipe(null)}
          />
          
          <div className="absolute inset-4 md:inset-10 bg-white rounded-3xl overflow-hidden flex flex-col">
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/30 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex-1 overflow-y-auto">
              {/* Image */}
              <div className="relative h-64 md:h-80">
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <div className="text-5xl mb-2">{selectedRecipe.emoji}</div>
                  <h2 className="text-3xl font-bold">{selectedRecipe.title}</h2>
                  <p className="text-white/80 mt-1">{selectedRecipe.description}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Stats */}
                <div className="flex flex-wrap gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-500">Temps</p>
                      <p className="font-semibold">{selectedRecipe.time} min</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                    <Users className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-500">Portions</p>
                      <p className="font-semibold">{selectedRecipe.servings} pers</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                    <ChefHat className={`w-4 h-4 ${getDifficultyLabel(selectedRecipe.difficulty).color}`} />
                    <div>
                      <p className="text-xs text-gray-500">Difficulté</p>
                      <p className="font-semibold">{getDifficultyLabel(selectedRecipe.difficulty).label}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Ingredients */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      🥘 Ingrédients
                    </h3>
                    
                    <ul className="space-y-2">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Steps */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      👨‍🍳 Préparation
                    </h3>
                    
                    <ol className="space-y-3">
                      {selectedRecipe.steps.map((step, i) => (
                        <li key={i} className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-orange-500 font-bold text-sm">Étape {i + 1}</span>
                          <p className="mt-1">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>Made with 🧡 by EdTheFox for Kenty</p>
        </div>
      </footer>
    </div>
  );
}
