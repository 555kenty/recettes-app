'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  Users, 
  Heart, 
  X, 
  ChefHat, 
  Flame,
  Leaf,
  UtensilsCrossed,
  ArrowRight,
  Star
} from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  description: string;
  image: string;
  time: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
  category: string;
}

const recipes: Recipe[] = [
  {
    id: 1,
    title: 'Pâtes Bolognaise',
    description: 'Un classique italien réconfortant, sauce tomate maison et viande fondante.',
    image: 'https://images.unsplash.com/photo-1626844131082-256783844137?w=800',
    time: 35,
    difficulty: 1,
    servings: 4,
    category: 'italien',
    tags: ['pâtes', 'italien', 'viande', 'rapide'],
    ingredients: [
      '400g de pâtes fraîches ou sèches',
      '300g de viande hachée de bœuf',
      '1 oignon jaune',
      '2 gousses d\'ail',
      '400g de tomates concassées',
      '2 c.à.s de concentré de tomate',
      'Huile d\'olive, sel, poivre, origan',
      'Parmesan fraîchement râpé'
    ],
    steps: [
      'Faire revenir l\'oignon et l\'ail émincés dans l\'huile d\'olive jusqu\'à translucidité',
      'Ajouter la viande hachée, la faire dorer en égrainant avec une fourchette',
      'Incorporer les tomates concassées et le concentré, assaisonner généreusement',
      'Laisser mijoter à feu doux 20-25 minutes en remuant de temps en temps',
      'Cuire les pâtes al dente dans un grand volume d\'eau salée',
      'Mélanger la sauce aux pâtes, servir bien chaud avec du parmesan'
    ]
  },
  {
    id: 2,
    title: 'Curry de Poulet Coco',
    description: 'Un voyage en Asie avec ce curry crémeux aux épices parfumées.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800',
    time: 30,
    difficulty: 1,
    servings: 4,
    category: 'asiatique',
    tags: ['poulet', 'asiatique', 'rapide', 'exotique'],
    ingredients: [
      '300g de riz basmati',
      '2 beaux filets de poulet',
      '400ml de lait de coco',
      '2 c.à.s de pâte de curry rouge ou jaune',
      '1 oignon, 2 gousses d\'ail',
      '1 poignée de coriandre fraîche',
      'Huile de colza ou de tournesol'
    ],
    steps: [
      'Rincer le riz et le cuire selon les instructions du paquet',
      'Couper le poulet en dés réguliers de 2cm environ',
      'Faire revenir l\'oignon dans l\'huile, ajouter le poulet et dorer',
      'Incorporer la pâte de curry, bien enrober la viande',
      'Verser le lait de coco, porter à ébullition puis baisser le feu',
      'Laisser mijoter 15 minutes jusqu\'à épaississement de la sauce',
      'Servir sur le riz, parsemer de coriandre ciselée'
    ]
  },
  {
    id: 3,
    title: 'Œufs Brouillés Parfaits',
    description: 'La technique secrète pour des œufs brouillés crémeux et délicats.',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?w=800',
    time: 7,
    difficulty: 1,
    servings: 2,
    category: 'petit-dej',
    tags: ['petit-déj', 'œufs', 'rapide', 'végétarien'],
    ingredients: [
      '4 œufs extra-frais',
      '20g de beurre demi-sel de qualité',
      '2 c.à.s de crème fraîche épaisse',
      'Sel fin et poivre du moulin',
      'Ciboulette fraîche (optionnel)'
    ],
    steps: [
      'Casser les œufs dans un bol, battre légèrement avec sel et poivre',
      'Faire fondre le beurre à feu doux dans une poêle antiadhésive',
      'Verser les œufs, remuer doucement avec une spatule en silicone',
      'Ajouter la crème fraîche quand les œufs commencent à prendre',
      'Retirer du feu alors que les œufs sont encore légèrement humides',
      'Servir immédiatement sur toast beurré ou avec du pain frais'
    ]
  },
  {
    id: 4,
    title: 'Pizza Pita Express',
    description: 'Une pizza maison croustillante prête en 15 minutes chrono.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    time: 15,
    difficulty: 1,
    servings: 2,
    category: 'rapide',
    tags: ['pizza', 'rapide', 'végétarien', 'snack'],
    ingredients: [
      '2 pains pita ou tortillas de blé',
      '4 c.à.s de sauce tomate épaisse',
      '100g de mozzarella râpée ou en tranches',
      'Quelques tranches de jambon (optionnel)',
      'Champignons de Paris émincés',
      'Origan séché, huile d\'olive'
    ],
    steps: [
      'Préchauffer le four à 200°C chaleur tournante',
      'Étaler la sauce tomate sur les pains pita',
      'Parsemer généreusement de fromage',
      'Ajouter les garnitures de votre choix',
      'Saupoudrer d\'origan et d\'un filet d\'huile d\'olive',
      'Enfourner 8-10 minutes jusqu\'à dorure du fromage',
      'Servir aussitôt, bien chaud'
    ]
  },
  {
    id: 5,
    title: 'Wrap Poulet & Légumes',
    description: 'Un repas frais et équilibré, parfait pour les lunchs express.',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
    time: 5,
    difficulty: 1,
    servings: 1,
    category: 'healthy',
    tags: ['wrap', 'healthy', 'rapide', 'poulet'],
    ingredients: [
      '1 grande tortilla de blé complet',
      '100g d\'escalope de poulet grillée',
      'Quelques feuilles de salade frisée',
      '1 tomate bien mûre',
      '1 c.à.s de fromage frais ou de sauce',
      'Sel, poivre, herbes de Provence'
    ],
    steps: [
      'Tartiner le fromage frais au centre de la tortilla',
      'Disposer la salade lavée et essorée',
      'Couper le poulet en lamelles, les répartir',
      'Ajouter la tomate coupée en rondelles',
      'Assaisonner légèrement',
      'Rouler serré en repliant les bords',
      'Couper en deux dans la diagonale et servir'
    ]
  },
  {
    id: 6,
    title: 'Riz Frit au Wok',
    description: 'Un plat asiatique complet aux saveurs umami et légumes croquants.',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb74b?w=800',
    time: 25,
    difficulty: 2,
    servings: 2,
    category: 'asiatique',
    tags: ['riz', 'asiatique', 'healthy', 'wok'],
    ingredients: [
      '300g de riz blanc cuit et refroidi',
      '2 œufs battus',
      '100g de petits pois',
      '1 carotte en petits dés',
      '2 c.à.s de sauce soja',
      '1 c.à.s d\'huile de sésame',
      '2 oignons nouveaux'
    ],
    steps: [
      'Faire cuire une fine omelette, la couper en lamelles',
      'Chauffer l\'huile dans un wok ou une grande poêle',
      'Faire sauter les légumes 3-4 minutes à feu vif',
      'Ajouter le riz froid, bien séparer les grains',
      'Verser la sauce soja et l\'huile de sésame, mélanger',
      'Remettre l\'omelette, chauffer 2 minutes',
      'Parsemer d\'oignons nouveaux émincés et servir'
    ]
  },
  {
    id: 7,
    title: 'Croque-Monsieur Grillé',
    description: 'Le sandwich français iconique, doré et fondant à souhait.',
    image: 'https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?w=800',
    time: 10,
    difficulty: 1,
    servings: 1,
    category: 'rapide',
    tags: ['sandwich', 'fromage', 'rapide', 'bistro'],
    ingredients: [
      '2 tranches de pain de mie de qualité',
      '2 tranches de jambon blanc',
      '2 tranches d\'emmental ou de gruyère',
      'Beurre doux pour tartiner',
      'Une pincée de muscade (optionnel)'
    ],
    steps: [
      'Beurrer légèrement une face de chaque tranche de pain',
      'Sur la face non beurrée, poser une tranche de fromage',
      'Ajouter le jambon, puis le fromage restant',
      'Refermer avec l\'autre tranche, face beurrée vers l\'extérieur',
      'Faire dorer dans une poêle chaude 3 minutes par face',
      'Le fromage doit être fondu et le pain bien doré'
    ]
  },
  {
    id: 8,
    title: 'Salade César Maison',
    description: 'Une salade gourmande avec sa sauce crémeuse et ses croûtons dorés.',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
    time: 15,
    difficulty: 1,
    servings: 2,
    category: 'healthy',
    tags: ['salade', 'healthy', 'poulet', 'frais'],
    ingredients: [
      '1 cœur de laitue romaine',
      '1 escalope de poulet grillée et tranchée',
      '50g de croûtons à l\'ail',
      '30g de parmesan en copeaux',
      'Pour la sauce : huile, citron, moutarde, œuf, anchois'
    ],
    steps: [
      'Laver la salade, l\'essorer et la couper en morceaux',
      'Préparer la sauce César en émulsionnant les ingrédients',
      'Disposer la salade dans un grand bol ou une assiette',
      'Ajouter le poulet chaud coupé en lamelles',
      'Parsemer de croûtons et de parmesan',
      'Napper généreusement de sauce au moment de servir'
    ]
  }
];

const categories = [
  { name: 'Italien', icon: UtensilsCrossed, color: 'bg-terracotta/10 text-terracotta' },
  { name: 'Rapide', icon: Flame, color: 'bg-mustard/20 text-mustard-dark' },
  { name: 'Healthy', icon: Leaf, color: 'bg-olive/10 text-olive' },
  { name: 'Asiatique', icon: ChefHat, color: 'bg-stone/20 text-charcoal' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
    setIsLoaded(true);
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

  const getDifficulty = (d: number) => {
    const stars = ['★', '★★', '★★★'][d - 1];
    const labels = ['Facile', 'Intermédiaire', 'Expert'][d - 1];
    return { stars, labels };
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-cream grain-overlay">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 glass-organic border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-terracotta to-mustard rounded-organic flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl text-charcoal">Cuisine</h1>
              <p className="text-xs text-stone -mt-1">à la Maison</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`p-2.5 rounded-full transition-all duration-300 ${
              showFavorites ? 'bg-terracotta text-white' : 'hover:bg-white/50 text-charcoal'
            }`}
          >
            <Heart className={`w-5 h-5 ${showFavorites ? 'fill-current' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-20">
        {/* Hero */}
        <section className="text-center mb-12 animate-slide-up">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-terracotta/20 to-mustard/20 rounded-full blur-3xl" />
            <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-terracotta to-mustard rounded-organic-lg flex items-center justify-center animate-float">
              <ChefHat className="w-16 h-16 text-white" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl text-charcoal mb-4 leading-tight">
            Recettes
            <span className="block text-gradient">Faciles</span>
          </h1>
          
          <p className="text-stone text-lg mb-8 max-w-lg mx-auto leading-relaxed">
            Découvrez des recettes gourmandes et accessibles pour cuisiner au quotidien
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto mb-8">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowFavorites(false);
              }}
              placeholder="Que souhaitez-vous cuisiner ?"
              className="input-organic pl-14 pr-12 text-charcoal placeholder:text-stone/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-stone/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-stone" />
              </button>
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="flex flex-wrap justify-center gap-3 mb-10 animate-slide-up delay-200">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => {
                  setSearchQuery(cat.name.toLowerCase());
                  setShowFavorites(false);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-organic ${cat.color}`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
          <button
            onClick={() => {
              setSearchQuery('');
              setShowFavorites(false);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium bg-charcoal text-white transition-all duration-300 hover:scale-105"
          >
            <Star className="w-4 h-4" />
            Toutes
          </button>
        </section>

        {/* Results Count */}
        <p className="text-center text-stone mb-6 animate-slide-up delay-300">
          <span className="font-display text-2xl text-terracotta">{filteredRecipes.length}</span>
          <span className="ml-2">recette{filteredRecipes.length !== 1 ? 's' : ''}</span>
          {showFavorites && ' dans vos favoris'}
        </p>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRecipes.map((recipe, index) => {
            const isFav = favorites.includes(recipe.id);
            const diff = getDifficulty(recipe.difficulty);
            
            return (
              <div
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
                className="card-organic group cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recipe.id);
                    }}
                    className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isFav 
                        ? 'bg-terracotta text-white scale-110' 
                        : 'bg-white/90 text-stone hover:bg-terracotta hover:text-white'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{recipe.time} min</span>
                  </div>
                  
                  <div className="absolute top-4 left-4">
                    <span className="badge-category text-xs">
                      {recipe.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display text-2xl text-charcoal mb-2 group-hover:text-terracotta transition-colors">
                    {recipe.title}
                  </h3>
                  
                  <p className="text-stone text-sm mb-4 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-stone">
                      <Users className="w-4 h-4" />
                      <span>{recipe.servings} pers.</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-terracotta">
                      <span className="text-amber-500">{diff.stars}</span>
                      <span className="text-stone text-xs ml-1">{diff.labels}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-20 animate-scale-in">
            <div className="w-24 h-24 mx-auto mb-6 bg-stone/10 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-stone" />
            </div>
            <h3 className="font-display text-2xl text-charcoal mb-2">
              Aucune recette trouvée
            </h3>
            <p className="text-stone">
              Essayez avec d'autres ingrédients ou catégories
            </p>
          </div>
        )}
      </main>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <div 
          className="fixed inset-0 z-50 animate-scale-in"
          onClick={() => setSelectedRecipe(null)}
        >
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />
          
          <div 
            className="absolute inset-4 md:inset-10 bg-cream rounded-organic-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-charcoal/50 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-charcoal transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto">
              {/* Image */}
              <div className="relative h-72 md:h-96">
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent" />
                
                <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white">
                  <span className="inline-block px-3 py-1 bg-terracotta text-white text-xs font-medium rounded-full mb-3">
                    {selectedRecipe.category}
                  </span>
                  <h2 className="font-display text-3xl md:text-4xl mb-2">
                    {selectedRecipe.title}
                  </h2>
                  <p className="text-white/80 max-w-xl">
                    {selectedRecipe.description}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                {/* Stats */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-soft">
                    <Clock className="w-5 h-5 text-terracotta" />
                    <div>
                      <p className="text-xs text-stone">Préparation</p>
                      <p className="font-medium text-charcoal">{selectedRecipe.time} min</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-soft">
                    <Users className="w-5 h-5 text-olive" />
                    <div>
                      <p className="text-xs text-stone">Portions</p>
                      <p className="font-medium text-charcoal">{selectedRecipe.servings} pers.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-soft">
                    <Star className="w-5 h-5 text-mustard" />
                    <div>
                      <p className="text-xs text-stone">Difficulté</p>
                      <p className="font-medium text-charcoal">
                        {getDifficulty(selectedRecipe.difficulty).labels}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Ingredients */}
                  <div>
                    <h3 className="font-display text-xl text-charcoal mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-terracotta/10 rounded-lg flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-terracotta" />
                      </div>
                      Ingrédients
                    </h3>
                    
                    <ul className="space-y-3">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow-soft">
                          <span className="w-2 h-2 mt-2 bg-terracotta rounded-full shrink-0" />
                          <span className="text-charcoal text-sm leading-relaxed">{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Steps */}
                  <div>
                    <h3 className="font-display text-xl text-charcoal mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-olive/10 rounded-lg flex items-center justify-center">
                        <ChefHat className="w-4 h-4 text-olive" />
                      </div>
                      Préparation
                    </h3>
                    
                    <ol className="space-y-4">
                      {selectedRecipe.steps.map((step, i) => (
                        <li key={i} className="p-4 bg-white rounded-xl shadow-soft">
                          <span className="text-terracotta font-display text-sm">
                            Étape {i + 1}
                          </span>
                          <p className="text-charcoal text-sm mt-1 leading-relaxed">
                            {step}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                
                {/* CTA */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => {
                      toggleFavorite(selectedRecipe.id);
                    }}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
                      favorites.includes(selectedRecipe.id)
                        ? 'bg-terracotta text-white'
                        : 'bg-charcoal text-white hover:bg-terracotta'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(selectedRecipe.id) ? 'fill-current' : ''}`} />
                    {favorites.includes(selectedRecipe.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone/10 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-terracotta to-mustard rounded-organic flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <p className="font-display text-xl text-charcoal mb-2">Cuisine à la Maison</p>
          <p className="text-stone text-sm">
            Recettes simples et gourmandes pour le quotidien
          </p>
          <p className="text-stone/60 text-xs mt-4">
            Conçu avec soin par EdTheFox pour Kenty
          </p>
        </div>
      </footer>
    </div>
  );
}
