'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Plus, Trash2, Search, User, Heart, BookOpen, ArrowRight, X, ShoppingCart, Leaf, Flame, Sparkles } from 'lucide-react';

// Types
interface PantryItem { id: number; name: string; category: string; quantity: number; addedAt: string; }
interface Recipe { id: number; title: string; time: string; image: string; likes: number; calories: number; difficulty: string; tags: string[]; description: string; }
interface UserProfile { name: string; goal: 'lose' | 'sport' | 'cook' | null; }

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
    if (savedUser) { setUser(JSON.parse(savedUser)); setStep('app'); }
    if (savedPantry) setPantry(JSON.parse(savedPantry));
  }, []);

  const saveUser = () => { localStorage.setItem('cc_user', JSON.stringify(user)); setStep('app'); };

  const addToPantry = () => {
    if (!newItem.name) return;
    const item = { id: Date.now(), ...newItem, addedAt: new Date().toISOString() };
    const updated = [...pantry, item];
    setPantry(updated);
    localStorage.setItem('cc_pantry', JSON.stringify(updated));
    setNewItem({ name: '', category: 'legumes', quantity: 1 });
    setShowAdd(false);
  };

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div className="text-center lg:text-left" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-rose-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Nouvelle expérience culinaire</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light text-white mb-6 leading-tight">
                Cuisine<span className="font-bold">Connect</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-lg mx-auto lg:mx-0">
                Votre compagnon culinaire intelligent. Découvrez des recettes adaptées à vos objectifs et gérez votre frigo comme un chef.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button onClick={() => setStep('goal')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                  Commencer <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 bg-white/10 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-colors">
                  En savoir plus
                </button>
              </div>
            </motion.div>
            
            <motion.div className="hidden lg:block" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl opacity-30 blur-2xl"></div>
                <div className="relative bg-white rounded-3xl p-6 shadow-2xl">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4">
                    <img src={RECIPES[0].image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{RECIPES[0].title}</h3>
                  <p className="text-slate-500">{RECIPES[0].description}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'goal') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <motion.h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              Quel est votre objectif ?
            </motion.h2>
            <p className="text-slate-500 text-lg">Personnalisons votre expérience culinaire</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GOALS.map((goal, i) => (
              <motion.button
                key={goal.id}
                onClick={() => { setUser({ ...user, goal: goal.id as any }); setStep('profile'); }}
                className="group p-8 bg-white rounded-3xl border-2 border-transparent hover:border-rose-200 transition-all text-left hover:shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                  <goal.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">{goal.label}</h3>
                <p className="text-slate-500 text-lg">{goal.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Comment vous appeler ?</h2>
          </div>
          
          <input
            type="text"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
            placeholder="Chef Kenty"
            className="w-full px-6 py-5 rounded-xl border-2 border-slate-200 focus:border-rose-500 outline-none text-lg mb-6 transition-colors"
            autoFocus
          />
          
          <button
            onClick={saveUser}
            disabled={!user.name}
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-5 rounded-xl font-semibold text-lg disabled:opacity-50 shadow-lg"
          >
            C'est parti !
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 h-screen sticky top-0 flex-shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Cuisine<span className="text-rose-500">Connect</span></span>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'fridge', label: 'Mon Frigo', icon: ChefHat },
                { id: 'recipes', label: 'Recettes', icon: BookOpen },
                { id: 'shopping', label: 'Courses', icon: ShoppingCart },
                { id: 'profile', label: 'Profil', icon: User },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === item.id 
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-white">{user.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{GOALS.find(g => g.id === user.goal)?.label}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="lg:hidden bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Bonjour</p>
                  <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                </div>
              </div>
              <Search className="w-5 h-5 text-slate-400" />
            </div>
          </header>

          <main className="p-4 lg:p-8 pb-24 lg:pb-8">
            <div className="max-w-6xl mx-auto">
              {activeTab === 'fridge' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Mon Frigo</p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''}</h2>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Ajouter</span>
                    </button>
                  </div>

                  {pantry.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-100">
                      <ChefHat className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Votre frigo est vide</h3>
                      <p className="text-slate-500 mb-6">Ajoutez des ingrédients pour commencer</p>
                      <button onClick={() => setShowAdd(true)} className="px-8 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold">
                        Ajouter
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {pantry.map((item) => {
                        const cat = CATEGORIES.find(c => c.id === item.category);
                        return (
                          <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-100">
                            <div className={`w-12 h-12 ${cat?.color} rounded-xl flex items-center justify-center mb-3`}>
                              <Leaf className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
                            <button onClick={() => { const u = pantry.filter(p => p.id !== item.id); setPantry(u); localStorage.setItem('cc_pantry', JSON.stringify(u)); }} className="mt-2 text-red-500 text-sm">
                              Supprimer
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recipes' && (
                <div>
                  <div className="mb-6">
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Découvrir</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Nos recettes</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {RECIPES.map((recipe) => (
                      <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow">
                        <div className="relative aspect-video">
                          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                          <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full">
                            <Heart className="w-5 h-5 text-slate-600" />
                          </button>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{recipe.title}</h3>
                          <p className="text-slate-500 text-sm mb-3">{recipe.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">{recipe.time}</span>
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-600">{recipe.difficulty}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'shopping' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Liste de courses</p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">{shoppingList.length} articles</h2>
                    </div>
                  </div>
                  
                  {shoppingList.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <p className="text-slate-500">Votre liste est vide</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100">
                      {shoppingList.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100">
                          <div className="w-5 h-5 rounded border-2 border-slate-300" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                    <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl font-bold text-white">{user.name.charAt(0)}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                    <p className="text-slate-500 mb-8">{GOALS.find(g => g.id === user.goal)?.label}</p>
                    
                    <button
                      onClick={() => { localStorage.clear(); window.location.reload(); }}
                      className="w-full py-4 text-red-500 border border-red-200 rounded-xl hover:bg-red-50"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3">
            <div className="flex justify-around">
              {[
                { id: 'fridge', icon: ChefHat },
                { id: 'recipes', icon: BookOpen },
                { id: 'shopping', icon: ShoppingCart },
                { id: 'profile', icon: User },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-2 ${activeTab === item.id ? 'text-rose-500' : 'text-slate-400'}`}>
                  <item.icon className="w-6 h-6" />
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full max-w-lg rounded-3xl p-6" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Ajouter</h3>
                <button onClick={() => setShowAdd(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Nom"
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 outline-none text-lg mb-4"
                autoFocus
              />
              
              <div className="grid grid-cols-4 gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewItem({ ...newItem, category: cat.id })}
                    className={`p-3 rounded-xl text-sm ${newItem.category === cat.id ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white' : 'bg-slate-100'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              <button onClick={addToPantry} disabled={!newItem.name} className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold disabled:opacity-50">
                Ajouter
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
