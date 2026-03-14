'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Plus, Trash2, Search, User, Heart, BookOpen, ArrowRight, X, ShoppingCart, Leaf, Flame, Sparkles, LogOut, Loader2, Lightbulb } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PantryEntry {
  id: string;
  quantity: string | null;
  ingredient: { id: string; name: string; category: string | null };
}

interface Recipe {
  id: string;
  title: string;
  timeMinutes: number | null;
  imageUrl: string | null;
  likeCount: number;
  calories: number | null;
  difficulty: string | null;
  tags: string[];
  description: string | null;
  cuisineType: string | null;
  category: string | null;
}

interface ShoppingItem { name: string; checked: boolean }

// ─── Constantes ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'Légumes', name: 'Légumes', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Fruits', name: 'Fruits', color: 'bg-rose-100 text-rose-700' },
  { id: 'Viandes', name: 'Viandes', color: 'bg-orange-100 text-orange-700' },
  { id: 'Poissons', name: 'Poissons', color: 'bg-blue-100 text-blue-700' },
  { id: 'Laitiers', name: 'Laitiers', color: 'bg-amber-100 text-amber-700' },
  { id: 'Épices', name: 'Épices', color: 'bg-purple-100 text-purple-700' },
  { id: 'Autre', name: 'Autres', color: 'bg-slate-100 text-slate-700' },
];

const GOALS = [
  { id: 'lose', label: 'Perdre du poids', desc: 'Recettes légères', icon: Leaf, color: 'from-emerald-500 to-teal-600' },
  { id: 'sport', label: 'Sport', desc: 'High protein', icon: Flame, color: 'from-orange-500 to-red-600' },
  { id: 'cook', label: 'Cuisiner', desc: 'Rapide et bon', icon: ChefHat, color: 'from-rose-500 to-pink-600' },
];

// ─── Composant principal ────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // UI state
  const [view, setView] = useState<'landing' | 'goal' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState('fridge');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Légumes' });

  // Data
  const [goal, setGoal] = useState<string | null>(null);
  const [pantry, setPantry] = useState<PantryEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [pantryLoading, setPantryLoading] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [search, setSearch] = useState('');

  // ── Charger le profil + données au login ──────────────────────────────────

  const loadProfile = useCallback(async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`);
    if (res.ok) {
      const { user } = await res.json();
      if (user.profile?.goal) {
        setGoal(user.profile.goal);
        setView('app');
        return true;
      }
    }
    return false;
  }, []);

  const loadPantry = useCallback(async (): Promise<PantryEntry[] | null> => {
    setPantryLoading(true);
    const res = await fetch('/api/pantry');
    if (res.ok) {
      const { pantry } = await res.json();
      setPantry(pantry);
      setPantryLoading(false);
      return pantry;
    }
    setPantryLoading(false);
    return null;
  }, []);

  const loadSuggestions = useCallback(async (currentPantry: PantryEntry[]) => {
    if (currentPantry.length === 0) return;
    setSuggestionsLoading(true);
    const res = await fetch('/api/recipes/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pantryItems: currentPantry.map((p) => p.ingredient.name) }),
    });
    if (res.ok) {
      const data = await res.json();
      setSuggestions(data.recipes);
    }
    setSuggestionsLoading(false);
  }, []);

  const loadRecipes = useCallback(async (q = '') => {
    setRecipesLoading(true);
    const params = new URLSearchParams({ limit: '24' });
    if (q) params.set('search', q);
    const res = await fetch(`/api/recipes?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecipes(data.recipes);
    }
    setRecipesLoading(false);
  }, []);

  const loadShoppingList = useCallback(async () => {
    const res = await fetch('/api/shopping-list');
    if (res.ok) {
      const { lists } = await res.json();
      if (lists.length > 0) {
        setShoppingListId(lists[0].id);
        setShoppingItems(lists[0].items ?? []);
      }
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) { setView('landing'); return; }

    loadProfile(session.user.id).then((hasGoal) => {
      if (hasGoal) {
        loadPantry().then((p) => { if (p) loadSuggestions(p); });
        loadRecipes();
        loadShoppingList();
      } else {
        setView('goal');
      }
    });
  }, [session, isPending, loadProfile, loadPantry, loadRecipes, loadShoppingList]);

  // Recherche recettes avec debounce
  useEffect(() => {
    if (view !== 'app') return;
    const t = setTimeout(() => loadRecipes(search), 400);
    return () => clearTimeout(t);
  }, [search, view, loadRecipes]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSelectGoal = async (selectedGoal: string) => {
    if (!session) return;
    setSavingGoal(true);
    await fetch(`/api/users/${session.user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: selectedGoal, isPublic: true }),
    });
    setGoal(selectedGoal);
    setView('app');
    setSavingGoal(false);
    loadPantry();
    loadRecipes();
    loadShoppingList();
  };

  const addToPantry = async () => {
    if (!newItem.name.trim()) return;
    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.name.trim(), quantity: null }),
    });
    if (res.ok) {
      const { entry } = await res.json();
      const updated = [entry, ...pantry];
      setPantry(updated);
      loadSuggestions(updated);
      setNewItem({ name: '', category: 'Légumes' });
      setShowAdd(false);
    }
  };

  const removeFromPantry = async (id: string) => {
    const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = pantry.filter((p) => p.id !== id);
      setPantry(updated);
      loadSuggestions(updated);
    }
  };

  const toggleFavorite = async (recipeId: string) => {
    await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
  };

  const saveShoppingList = async (items: ShoppingItem[]) => {
    if (shoppingListId) {
      await fetch(`/api/shopping-list/${shoppingListId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } else {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ma liste', items }),
      });
      if (res.ok) {
        const { list } = await res.json();
        setShoppingListId(list.id);
      }
    }
    setShoppingItems(items);
  };

  const addToShoppingList = async (name: string) => {
    const items = [...shoppingItems, { name, checked: false }];
    await saveShoppingList(items);
  };

  const toggleShoppingItem = async (i: number) => {
    const items = shoppingItems.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it);
    await saveShoppingList(items);
  };

  // ── Rendu conditionnel ────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
      </div>
    );
  }

  // Landing page (non connecté)
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div className="text-center lg:text-left" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-rose-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>598 recettes du monde entier</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light text-white mb-6 leading-tight">
                Cuisine<span className="font-bold">Connect</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-lg mx-auto lg:mx-0">
                Votre compagnon culinaire intelligent. Découvrez des recettes adaptées à vos objectifs et gérez votre frigo comme un chef.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button onClick={() => router.push('/login')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                  Commencer <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => router.push('/register')} className="px-8 py-4 bg-white/10 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-colors">
                  Créer un compte
                </button>
              </div>
            </motion.div>
            <motion.div className="hidden lg:block" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl opacity-30 blur-2xl" />
                <div className="relative bg-white rounded-3xl p-6 shadow-2xl">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center mb-4">
                    <ChefHat className="w-20 h-20 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Jerk chicken with rice & peas</h3>
                  <p className="text-slate-500 text-sm">Cuisine jamaïcaine • Enrichi par IA</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Sélection de l'objectif (post-login, 1ère fois)
  if (view === 'goal') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <motion.h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              Bonjour{session?.user.name ? `, ${session.user.name.split(' ')[0]}` : ''} !
            </motion.h2>
            <p className="text-slate-500 text-lg">Quel est votre objectif culinaire ?</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GOALS.map((g, i) => (
              <motion.button
                key={g.id}
                onClick={() => !savingGoal && handleSelectGoal(g.id)}
                disabled={savingGoal}
                className="group p-8 bg-white rounded-3xl border-2 border-transparent hover:border-rose-200 transition-all text-left hover:shadow-2xl disabled:opacity-60"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                  <g.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">{g.label}</h3>
                <p className="text-slate-500 text-lg">{g.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── App principale ────────────────────────────────────────────────────────

  const userName = session?.user.name ?? 'Chef';
  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Sidebar desktop */}
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
                { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, badge: suggestions.length || undefined },
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
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                  {'badge' in item && item.badge ? (
                    <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>
                  ) : null}
                </button>
              ))}
            </nav>
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-xs text-slate-400 truncate">{goalLabel}</p>
              </div>
              <button onClick={() => signOut()} className="text-slate-400 hover:text-red-500 transition-colors" title="Se déconnecter">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Header mobile */}
          <header className="lg:hidden bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Bonjour</p>
                  <p className="font-bold text-slate-800 text-sm">{userName}</p>
                </div>
              </div>
              <Search className="w-5 h-5 text-slate-400" />
            </div>
          </header>

          <main className="p-4 lg:p-8 pb-24 lg:pb-8">
            <div className="max-w-6xl mx-auto">

              {/* ── Frigo ── */}
              {activeTab === 'fridge' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Mon Frigo</p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
                        {pantryLoading ? '…' : `${pantry.length} ingrédient${pantry.length !== 1 ? 's' : ''}`}
                      </h2>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Ajouter</span>
                    </button>
                  </div>

                  {pantryLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-rose-400 animate-spin" /></div>
                  ) : pantry.length === 0 ? (
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
                        const cat = CATEGORIES.find((c) => c.id === item.ingredient.category) ?? CATEGORIES[CATEGORIES.length - 1];
                        return (
                          <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-shadow">
                            <div className={`w-12 h-12 ${cat.color} rounded-xl flex items-center justify-center mb-3`}>
                              <Leaf className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-800 truncate capitalize">{item.ingredient.name}</h4>
                            <button
                              onClick={() => removeFromPantry(item.id)}
                              className="mt-2 flex items-center gap-1 text-red-400 text-sm hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Supprimer
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Suggestions frigo ── */}
              {activeTab === 'suggestions' && (
                <div>
                  <div className="mb-6">
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Basé sur votre frigo</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Suggestions</h2>
                    <p className="text-slate-500 text-sm mt-1">Recettes réalisables avec vos {pantry.length} ingrédients</p>
                  </div>

                  {pantry.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Frigo vide</h3>
                      <p className="text-slate-500 mb-6">Ajoutez des ingrédients pour voir les suggestions</p>
                      <button onClick={() => setActiveTab('fridge')} className="px-8 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold">
                        Remplir mon frigo
                      </button>
                    </div>
                  ) : suggestionsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-rose-400 animate-spin" /></div>
                  ) : suggestions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <p className="text-slate-500">Aucune recette trouvée avec vos ingrédients actuels</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggestions.map((recipe) => {
                        const r = recipe as Recipe & { matchScore?: number; missingIngredients?: string[] };
                        return (
                          <div key={r.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow group">
                            <div className="relative aspect-video bg-slate-100">
                              {r.imageUrl ? (
                                <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><ChefHat className="w-12 h-12 text-slate-300" /></div>
                              )}
                              {r.matchScore !== undefined && (
                                <span className="absolute top-3 left-3 px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                                  {Math.round(r.matchScore * 100)}% match
                                </span>
                              )}
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-slate-800 line-clamp-1 mb-1">{r.title}</h3>
                              {r.missingIngredients && r.missingIngredients.length > 0 && (
                                <p className="text-xs text-slate-400 mb-2">
                                  Il manque : {r.missingIngredients.slice(0, 3).join(', ')}{r.missingIngredients.length > 3 ? ` +${r.missingIngredients.length - 3}` : ''}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const missing = r.missingIngredients ?? [];
                                    if (missing.length > 0) {
                                      Promise.all(missing.map((item) =>
                                        fetch('/api/shopping-list', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ name: 'Ma liste', items: missing.map((n) => ({ name: n, checked: false })) }),
                                        })
                                      )).then(() => setActiveTab('shopping'));
                                    }
                                  }}
                                  className="flex-1 text-xs py-2 border border-slate-200 rounded-xl text-slate-600 hover:border-rose-300 hover:text-rose-500 transition-colors"
                                >
                                  + Ajouter aux courses
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Recettes ── */}
              {activeTab === 'recipes' && (
                <div>
                  <div className="mb-6">
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Découvrir</p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4">Nos recettes</h2>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une recette..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {recipesLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-rose-400 animate-spin" /></div>
                  ) : recipes.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <p className="text-slate-500">Aucune recette trouvée</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recipes.map((recipe) => (
                        <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow group">
                          <div className="relative aspect-video bg-slate-100">
                            {recipe.imageUrl ? (
                              <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><ChefHat className="w-12 h-12 text-slate-300" /></div>
                            )}
                            <button
                              onClick={() => toggleFavorite(recipe.id)}
                              className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                            >
                              <Heart className="w-5 h-5 text-slate-600 hover:text-rose-500 transition-colors" />
                            </button>
                            {recipe.cuisineType && (
                              <span className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full">{recipe.cuisineType}</span>
                            )}
                          </div>
                          <div className="p-5">
                            <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-1">{recipe.title}</h3>
                            {recipe.description && <p className="text-slate-500 text-sm mb-3 line-clamp-2">{recipe.description}</p>}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{recipe.timeMinutes ? `${recipe.timeMinutes} min` : '–'}</span>
                              <div className="flex items-center gap-2">
                                {recipe.calories && <span className="text-slate-400">{recipe.calories} kcal</span>}
                                {recipe.difficulty && <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-600">{recipe.difficulty}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Liste de courses ── */}
              {activeTab === 'shopping' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Liste de courses</p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">{shoppingItems.length} articles</h2>
                    </div>
                  </div>

                  {/* Ajouter un article */}
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      placeholder="Ajouter un article..."
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-rose-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          addToShoppingList(e.currentTarget.value.trim());
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      className="px-4 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                        if (input.value.trim()) { addToShoppingList(input.value.trim()); input.value = ''; }
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {shoppingItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                      <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                      <p className="text-slate-500">Votre liste est vide</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                      {shoppingItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => toggleShoppingItem(i)}
                            className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-colors ${item.checked ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`}
                          />
                          <span className={item.checked ? 'line-through text-slate-400' : 'text-slate-800'}>{item.name}</span>
                          <button
                            onClick={() => saveShoppingList(shoppingItems.filter((_, idx) => idx !== i))}
                            className="ml-auto text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Profil ── */}
              {activeTab === 'profile' && (
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                    {session?.user.image ? (
                      <img src={session.user.image} alt="" className="w-24 h-24 rounded-full mx-auto mb-6 object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <h2 className="text-2xl font-bold text-slate-800">{userName}</h2>
                    <p className="text-slate-500 mb-2">{session?.user.email}</p>
                    <p className="text-rose-500 font-medium mb-8">{goalLabel}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8 text-center">
                      <div className="bg-slate-50 rounded-2xl p-4">
                        <p className="text-2xl font-bold text-slate-800">{pantry.length}</p>
                        <p className="text-sm text-slate-500">Ingrédients</p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4">
                        <p className="text-2xl font-bold text-slate-800">{shoppingItems.length}</p>
                        <p className="text-sm text-slate-500">Courses</p>
                      </div>
                    </div>

                    <button
                      onClick={() => signOut().then(() => router.push('/login'))}
                      className="w-full py-4 text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Nav mobile */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3">
            <div className="flex justify-around">
              {[
                { id: 'fridge', icon: ChefHat },
                { id: 'suggestions', icon: Lightbulb },
                { id: 'recipes', icon: BookOpen },
                { id: 'shopping', icon: ShoppingCart },
                { id: 'profile', icon: User },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`relative p-2 ${activeTab === item.id ? 'text-rose-500' : 'text-slate-400'}`}>
                  <item.icon className="w-6 h-6" />
                  {item.id === 'suggestions' && suggestions.length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {suggestions.length > 9 ? '9+' : suggestions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Modal ajout frigo */}
      <AnimatePresence>
        {showAdd && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full max-w-lg rounded-3xl p-6" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Ajouter un ingrédient</h3>
                <button onClick={() => setShowAdd(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addToPantry()}
                placeholder="Ex : tomates cerises"
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 outline-none text-lg mb-4"
                autoFocus
              />
              <div className="grid grid-cols-4 gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewItem({ ...newItem, category: cat.id })}
                    className={`p-3 rounded-xl text-xs font-medium transition-colors ${newItem.category === cat.id ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
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
