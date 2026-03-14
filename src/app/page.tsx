'use client';

import { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Search, 
  User,
  Heart,
  BookOpen,
  ArrowRight,
  X
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

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
}

interface UserProfile {
  name: string;
  avatar: string | null;
}

const CATEGORIES: Category[] = [
  { id: 'legumes', name: 'Légumes', emoji: '🥬', color: 'bg-green-100' },
  { id: 'fruits', name: 'Fruits', emoji: '🍎', color: 'bg-red-100' },
  { id: 'viandes', name: 'Viandes', emoji: '🥩', color: 'bg-orange-100' },
  { id: 'poissons', name: 'Poissons', emoji: '🐟', color: 'bg-blue-100' },
  { id: 'laitiers', name: 'Laitiers', emoji: '🥛', color: 'bg-yellow-100' },
  { id: 'epices', name: 'Épices', emoji: '🌿', color: 'bg-emerald-100' },
  { id: 'autres', name: 'Autres', emoji: '📦', color: 'bg-gray-100' },
];

const SAMPLE_RECIPES: Recipe[] = [
  { id: 1, title: 'Pâtes Carbonara', time: '20 min', image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', likes: 234 },
  { id: 2, title: 'Salade César', time: '15 min', image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', likes: 189 },
  { id: 3, title: 'Poulet Curry', time: '30 min', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', likes: 312 },
];

export default function Home() {
  const [step, setStep] = useState<string>('onboarding');
  const [user, setUser] = useState<UserProfile>({ name: '', avatar: null });
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('fridge');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<{ name: string; category: string; quantity: number }>({ name: '', category: 'legumes', quantity: 1 });

  // Check if user has completed onboarding
  useEffect(() => {
    const savedUser = localStorage.getItem('cc_user');
    const savedPantry = localStorage.getItem('cc_pantry');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setStep('app');
    }
    if (savedPantry) {
      setPantry(JSON.parse(savedPantry));
    }
  }, []);

  const saveUser = () => {
    localStorage.setItem('cc_user', JSON.stringify(user));
    setStep('app');
  };

  const addToPantry = () => {
    if (!newItem.name) return;
    const item: PantryItem = {
      id: Date.now(),
      ...newItem,
      addedAt: new Date().toISOString(),
    };
    const updated = [...pantry, item];
    setPantry(updated);
    localStorage.setItem('cc_pantry', JSON.stringify(updated));
    setNewItem({ name: '', category: 'legumes', quantity: 1 });
    setShowAddModal(false);
  };

  const removeFromPantry = (id: number) => {
    const updated = pantry.filter(item => item.id !== id);
    setPantry(updated);
    localStorage.setItem('cc_pantry', JSON.stringify(updated));
  };

  // Onboarding Steps
  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-coral-500 to-coral-600 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center animate-bounce">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-xl">
            <ChefHat className="w-12 h-12 text-coral-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4">CuisineConnect</h1>
          <p className="text-lg opacity-90 mb-8">
            Gérez votre frigo et découvrez des recettes personnalisées
          </p>
          
          <button 
            onClick={() => setStep('profile')}
            className="bg-white text-coral-500 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
          >
            Commencer
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-cream-50 p-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-charcoal-800 mb-2">Créez votre profil</h2>
          <p className="text-gray-600 mb-8">Personnalisez votre expérience</p>
          
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre pseudo
            </label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              placeholder="ChefKenty"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-coral-500 outline-none text-lg mb-6"
            />
            
            <button
              onClick={saveUser}
              disabled={!user.name}
              className="w-full bg-coral-500 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-coral-600 transition-colors"
            >
              C&apos;est parti !
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-cream-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-coral-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bonjour</p>
              <h1 className="font-bold text-charcoal-800">{user.name}</h1>
            </div>
          </div>
          
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Search className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {activeTab === 'fridge' && (
          <div className="animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Mon Frigo</h2>
              <span className="text-sm text-gray-500">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''}</span>
            </div>

            {pantry.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🧊</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Votre frigo est vide</h3>
                <p className="text-gray-500 mb-4">Ajoutez des ingrédients pour commencer</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-coral-500 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {pantry.map((item) => {
                  const cat = CATEGORIES.find(c => c.id === item.category);
                  return (
                    <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm relative group">
                      <button
                        onClick={() => removeFromPantry(item.id)}
                        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                      <div className={`w-12 h-12 ${cat?.color} rounded-xl flex items-center justify-center text-2xl mb-2`}>
                        {cat?.emoji}
                      </div>
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity} unité{item.quantity > 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-coral-50 border-2 border-dashed border-coral-300 rounded-2xl p-4 flex flex-col items-center justify-center text-coral-500 min-h-[120px]"
                >
                  <Plus className="w-8 h-8 mb-1" />
                  <span className="text-sm font-medium">Ajouter</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="animate-in fade-in">
            <h2 className="text-xl font-bold mb-4">Découvrir</h2>
            
            <div className="space-y-4">
              {SAMPLE_RECIPES.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="relative h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                    <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full">
                      <Heart className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg">{recipe.title}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                      <span>⏱️ {recipe.time}</span>
                      <span>❤️ {recipe.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="text-center py-12 animate-in fade-in">
            <span className="text-6xl mb-4 block">👨‍🍳👩‍🍳</span>
            <h2 className="text-xl font-bold mb-2">Communauté</h2>
            <p className="text-gray-500">Partagez vos recettes avec la communauté</p>
            <p className="text-sm text-gray-400 mt-4">(Bientôt disponible)</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
              <div className="w-20 h-20 bg-coral-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-gray-500">{pantry.length} ingrédients • 0 recettes</p>
            </div>
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Ajouter un ingrédient</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Nom de l&apos;ingrédient"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-coral-500 outline-none text-lg mb-4"
              autoFocus
            />

            <p className="text-sm font-medium text-gray-700 mb-3">Catégorie</p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNewItem({ ...newItem, category: cat.id })}
                  className={`p-3 rounded-xl text-center transition-colors ${
                    newItem.category === cat.id 
                      ? 'bg-coral-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-2xl block mb-1">{cat.emoji}</span>
                  <span className="text-xs">{cat.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={addToPantry}
              disabled={!newItem.name}
              className="w-full bg-coral-500 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('fridge')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'fridge' ? 'text-coral-500' : 'text-gray-400'}`}
          >
            <span className="text-2xl mb-1">🧊</span>
            <span className="text-xs font-medium">Frigo</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('recipes')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'recipes' ? 'text-coral-500' : 'text-gray-400'}`}
          >
            <BookOpen className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Recettes</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'community' ? 'text-coral-500' : 'text-gray-400'}`}
          >
            <span className="text-2xl mb-1">👥</span>
            <span className="text-xs font-medium">Commu</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'profile' ? 'text-coral-500' : 'text-gray-400'}`}
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
