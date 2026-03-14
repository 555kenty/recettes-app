'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, Plus, Trash2, Search, User, Heart, BookOpen, ArrowRight, X,
  Upload, Target, Flame, Leaf, ShoppingCart, Sparkles, ChevronRight
} from 'lucide-react';

// Types
interface PantryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  addedAt: string;
}

interface Recipe {
  id: number;
  title: string;
  time: string;
  image: string;
  likes: number;
  calories: number;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  tags: string[];
  description: string;
}

interface UserProfile {
  name: string;
  goal: 'lose' | 'sport' | 'cook' | null;
}

const CATEGORIES = [
  { id: 'legumes', name: 'Légumes', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'fruits', name: 'Fruits', color: 'bg-rose-100 text-rose-700' },
  { id: 'viandes', name: 'Viandes', color: 'bg-orange-100 text-orange-700' },
  { id: 'poissons', name: 'Poissons', color: 'bg-blue-100 text-blue-700' },
  { id: 'laitiers', name: 'Laitiers', color: 'bg-amber-100 text-amber-700' },
  { id: 'epices', name: 'Épices', color: 'bg-purple-100 text-purple-700' },
  { id: 'autres', name: 'Autres', color: 'bg-slate-100 text-slate-700' },
];

const RECIPES: Recipe[] = [
  { id: 1, title: 'Pâtes Carbonara', time: '20 min', image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600', likes: 234, calories: 650, difficulty: 'Facile', tags: ['Italien'], description: 'La vraie recette romaine' },
  { id: 2, title: 'Salade César', time: '15 min', image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600', likes: 189, calories: 320, difficulty: 'Facile', tags: ['Healthy'], description: 'Poulet grillé et croûtons' },
  { id: 3, title: 'Poulet Curry', time: '30 min', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600', likes: 312, calories: 480, difficulty: 'Moyen', tags: ['Indien'], description: 'Curry parfumé au lait de coco' },
  { id: 4, title: 'Saumon Grillé', time: '25 min', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600', likes: 278, calories: 420, difficulty: 'Moyen', tags: ['Healthy'], description: 'Saumon laqué au miso' },
  { id: 5, title: 'Risotto', time: '35 min', image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600', likes: 156, calories: 580, difficulty: 'Difficile', tags: ['Italien'], description: 'Crémeux aux champignons' },
  { id: 6, title: 'Buddha Bowl', time: '20 min', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600', likes: 423, calories: 450, difficulty: 'Facile', tags: ['Healthy'], description: 'Quinoa et légumes frais' },
];

const GOALS = [
  { id: 'lose', label: 'Perdre du poids', desc: 'Recettes légères', icon: Leaf, color: 'from-emerald-500 to-teal-600' },
  { id: 'sport', label: 'Sport', desc: 'High protein', icon: Flame, color: 'from-orange-500 to-red-600' },
  { id: 'cook', label: 'Cuisiner', desc: 'Rapide et bon', icon: ChefHat, color: 'from-rose-500 to-pink-600' },
];

export default function Home() {
  const [step, setStep] = useState<'onboarding' | 'goal' | 'profile' | 'app'>('onboarding');
  const [user, setUser] = useState<UserProfile>({ name: '', goal: null });
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [activeTab, setActiveTab] = useState('fridge');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'legumes', quantity: 1 });
  const [shoppingList, setShoppingList] = useState<string[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('cc_user');
    const savedPantry = localStorage.getItem('cc_pantry');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setStep('app');
    }
    if (savedPantry) setPantry(JSON.parse(savedPantry));
  }, []);

  const saveUser = () => {
    localStorage.setItem('cc_user', JSON.stringify(user));
    setStep('app');
  };

  const addToPantry = () => {
    if (!newItem.name) return;
    const item = { id: Date.now(), ...newItem, addedAt: new Date().toISOString() };
    const updated = [...pantry, item];
    setPantry(updated);
    localStorage.setItem('cc_pantry', JSON.stringify(updated));
    setNewItem({ name: '', category: 'legumes', quantity: 1 });
    setShowAdd(false);
  };

  // ONBOARDING
  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <motion.div className="text-center max-w-2xl" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-rose-400 to-amber-400 rounded-3xl flex items-center justify-center shadow-2xl">
            <ChefHat className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-5xl md:text-7xl font-light mb-4 text-white">Cuisine<span className="font-bold">Connect</span></h1>
          <p className="text-xl text-slate-300 mb-8">Votre compagnon culinaire intelligent</p>
          <button onClick={() => setStep('goal')} className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-semibold text-lg flex items-center gap-3 mx-auto hover:scale-105 transition-transform">
            Commencer <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  // GOAL
  if (step === 'goal') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div className="w-full max-w-4xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Votre objectif</h2>
            <p className="text-slate-500">Personnalisons votre expérience</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => { setUser({ ...user, goal: goal.id as any }); setStep('profile'); }}
                className="p-8 rounded-3xl bg-white border-2 border-transparent hover:border-rose-200 transition-all text-left hover:shadow-xl"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-white mb-6`}>
                  <goal.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2">{goal.label}</h3>
                <p className="text-slate-500">{goal.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // PROFILE
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Comment vous appeler ?</h2>
          </div>
          <input
            type="text"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
            placeholder="Chef Kenty"
            className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 outline-none text-lg mb-6"
            autoFocus
          />
          <button
            onClick={saveUser}
            disabled={!user.name}
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50"
          >
            C&apos;est parti !
          </button>
        </motion.div>
      </div>
    );
  }

  // MAIN APP - RESPONSIVE
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop: Sidebar + Content */}
      <div className="lg:flex">
        
        {/* Sidebar - Desktop Only */}
        <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 h-screen sticky top-0">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-bold text-xl">Cuisine<span className="text-rose-500">Connect</span></h1>
            </div>

            <nav className="space-y-2">
              {[
                { id: 'fridge', label: 'Mon Frigo', icon: ChefHat },
                { id: 'recipes', label: 'Recettes', icon: BookOpen },
                { id: 'shopping', label: 'Courses', icon: ShoppingCart },
                { id: 'profile', label: 'Profil', icon: User },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                    activeTab === item.id 
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {activeTab === item.id && <ChevronRight className="w-5 h-5 ml-auto" />}
                </button>
              ))}
            </nav>

            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center">
                  <span className="font-bold text-white">{user.name.charAt(0)}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{GOALS.find(g => g.id === user.goal)?.label}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          
          {/* Mobile Header */}
          <header className="lg:hidden bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Bonjour</p>
                  <p className="font-bold text-slate-800">{user.name}</p>
                </div>
              </div>
              <Search className="w-6 h-6 text-slate-400" />
            </div>
          </header>

          {/* Content */}
          <div className="p-6 lg:p-10">
            <div className="max-w-6xl mx-auto">
              
              {/* FRIDGE TAB */}
              {activeTab === 'fridge' && (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-1">Mon Frigo</p>
                      <h2 className="text-3xl font-bold text-slate-800">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''}</h2>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg">
                      <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Ajouter</span>
                    </button>
                  </div>

                  {pantry.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ChefHat className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Votre frigo est vide</h3>
                      <p className="text-slate-500 mb-6">Ajoutez des ingrédients pour découvrir des recettes</p>
                      <button onClick={() => setShowAdd(true)} className="px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold">
                        Ajouter un ingrédient
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {pantry.map((item) => {
                        const cat = CATEGORIES.find(c => c.id === item.category);
                        return (
                          <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg transition-shadow">
                            <div className={`w-12 h-12 ${cat?.color} rounded-xl flex items-center justify-center mb-4`}>
                              <Leaf className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
                            <p className="text-sm text-slate-400">{item.quantity} unité{item.quantity > 1 ? 's' : ''}</p>
                            <button onClick={() => {
                              const updated = pantry.filter(p => p.id !== item.id);
                              setPantry(updated);
                              localStorage.setItem('cc_pantry', JSON.stringify(updated));
                            }} className="mt-4 text-red-500 text-sm flex items-center gap-1">
                              <Trash2 className="w-4 h-4" /> Supprimer
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* RECIPES TAB */}
              {activeTab === 'recipes' && (
                <div>
                  <div className="mb-8">
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-1">Découvrir</p>
                    <h2 className="text-3xl font-bold text-slate-800">Nos recettes</h2>
                  </div>

                  {/* Featured Recipe - Desktop */}
                  <div className="hidden lg:grid grid-cols-2 gap-8 mb-10 bg-white rounded-3xl overflow-hidden border border-slate-100">
                    <div className="p-10 flex flex-col justify-center">
                      <p className="text-sm font-bold text-rose-500 uppercase mb-4">Recette du jour</p>
                      <h3 className="text-4xl font-bold text-slate-800 mb-4">{RECIPES[0].title}</h3>
                      <p className="text-slate-500 mb-6">{RECIPES[0].description}</p>
                      <div className="flex gap-4">
                        <span className="px-4 py-2 bg-slate-100 rounded-full text-sm">{RECIPES[0].time}</span>
                        <span className="px-4 py-2 bg-slate-100 rounded-full text-sm">{RECIPES[0].calories} kcal</span>
                      </div>
                    </div>
                    <div className="relative h-80">
                      <img src={RECIPES[0].image} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Recipes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {RECIPES.slice(1).map((recipe) => (
                      <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow">
                        <div className="relative h-48">
                          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                          <button className="absolute top-4 right-4 p-2 bg-white/90 rounded-full">
                            <Heart className="w-5 h-5 text-slate-600" />
                          </button>
                        </div>
                        <div className="p-6">
                          <h3 className="font-bold text-xl text-slate-800 mb-2">{recipe.title}</h3>
                          <p className="text-slate-500 text-sm mb-4">{recipe.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">{recipe.time} • {recipe.calories} kcal</span>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              recipe.difficulty === 'Facile' ? 'bg-green-100 text-green-700' :
                              recipe.difficulty === 'Moyen' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {recipe.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHOPPING TAB */}
              {activeTab === 'shopping' && (
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-sm font-bold text-rose-500 uppercase tracking-wider mb-1">Liste de courses</p>
                      <h2 className="text-3xl font-bold text-slate-800">{shoppingList.length} articles</h2>
                    </div>
                    <button className="px-6 py-3 border-2 border-slate-200 rounded-xl font-semibold hover:border-rose-500 hover:text-rose-500 transition-colors">
                      Importer
                    </button>
                  </div>

                  {shoppingList.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Liste vide</h3>
                      <p className="text-slate-500">Importez votre liste de courses</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100">
                      {shoppingList.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100 last:border-0">
                          <div className="w-5 h-5 rounded border-2 border-slate-300" />
                          <span className="text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                    <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl font-bold text-white">{user.name.charAt(0)}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{user.name}</h2>
                    <p className="text-slate-500 mb-8">{GOALS.find(g => g.id === user.goal)?.label}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">{pantry.length}</p>
                        <p className="text-sm text-slate-400">Ingrédients</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">6</p>
                        <p className="text-sm text-slate-400">Recettes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-800">{shoppingList.length}</p>
                        <p className="text-sm text-slate-400">À acheter</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="w-full py-4 text-red-500 font-semibold border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Bottom Nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3">
            <div className="flex items-center justify-around">
              {[
                { id: 'fridge', icon: ChefHat },
                { id: 'recipes', icon: BookOpen },
                { id: 'shopping', icon: ShoppingCart },
                { id: 'profile', icon: User },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-3 ${activeTab === item.id ? 'text-rose-500' : 'text-slate-400'}`}>
                  <item.icon className="w-6 h-6" />
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full max-w-lg rounded-3xl p-6" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Ajouter un ingrédient</h3>
                <button onClick={() => setShowAdd(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Nom de l'ingrédient"
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 outline-none text-lg mb-4"
                autoFocus
              />
              
              <div className="grid grid-cols-4 gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewItem({ ...newItem, category: cat.id })}
                    className={`p-3 rounded-xl text-center text-sm transition-all ${
                      newItem.category === cat.id 
                        ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              <button
                onClick={addToPantry}
                disabled={!newItem.name}
                className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50"
              >
                Ajouter
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
