'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, User, Heart, BookOpen, ArrowRight, X,
  ShoppingCart, Leaf, Flame, Sparkles, LogOut, Loader2,
  Lightbulb, Apple, Fish, Milk, FlaskConical, ChefHat,
  Globe, Compass, CheckCheck, Trash2
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { RecipeCard } from '@/app/components/RecipeCard';

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
  enriched: boolean;
  servings?: number | null;
  matchScore?: number;
  missingIngredients?: string[];
}

interface ShoppingItem { name: string; checked: boolean }
interface IngredientSuggestion { id: string; name: string; category: string | null }

// ─── Constantes ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'Légumes',  icon: Leaf,          color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Fruits',   icon: Apple,         color: 'bg-rose-100 text-rose-700' },
  { id: 'Viandes',  icon: Flame,         color: 'bg-orange-100 text-orange-700' },
  { id: 'Poissons', icon: Fish,          color: 'bg-blue-100 text-blue-700' },
  { id: 'Laitiers', icon: Milk,          color: 'bg-amber-100 text-amber-700' },
  { id: 'Épices',   icon: FlaskConical,  color: 'bg-purple-100 text-purple-700' },
  { id: 'Autre',    icon: Leaf,          color: 'bg-stone-100 text-stone-600' },
];

const GOALS = [
  {
    id: 'lose', label: 'Manger sain', desc: 'Recettes légères et équilibrées',
    image: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    color: '#065F46',
  },
  {
    id: 'sport', label: 'Objectif sport', desc: 'High-protein, haute énergie',
    image: 'https://www.themealdb.com/images/media/meals/ysxwuq1487323065.jpg',
    color: '#92400E',
  },
  {
    id: 'cook', label: 'Cuisiner & partager', desc: 'Explorer, créer, régaler',
    image: 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg',
    color: '#1E1B4B',
  },
];

const NAV_ITEMS = [
  { id: 'fridge',      label: 'Mon Frigo',    icon: ChefHat },
  { id: 'suggestions', label: 'Suggestions',  icon: Lightbulb },
  { id: 'recipes',     label: 'Découvrir',    icon: Compass },
  { id: 'shopping',    label: 'Courses',      icon: ShoppingCart },
  { id: 'profile',     label: 'Profil',       icon: User },
];

// ─── Composant principal ────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [view, setView] = useState<'landing' | 'goal' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState('fridge');
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Légumes');
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteTimeout = useRef<NodeJS.Timeout | null>(null);

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
  const [shoppingInput, setShoppingInput] = useState('');

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadProfile = useCallback(async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`);
    if (res.ok) {
      const { user } = await res.json();
      if (user.profile?.goal) { setGoal(user.profile.goal); setView('app'); return true; }
    }
    return false;
  }, []);

  const loadPantry = useCallback(async (): Promise<PantryEntry[] | null> => {
    setPantryLoading(true);
    const res = await fetch('/api/pantry');
    if (res.ok) { const { pantry } = await res.json(); setPantry(pantry); setPantryLoading(false); return pantry; }
    setPantryLoading(false); return null;
  }, []);

  const loadSuggestions = useCallback(async (currentPantry: PantryEntry[]) => {
    if (currentPantry.length === 0) return;
    setSuggestionsLoading(true);
    const res = await fetch('/api/recipes/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pantryItems: currentPantry.map((p) => p.ingredient.name) }),
    });
    if (res.ok) { const data = await res.json(); setSuggestions(data.recipes); }
    setSuggestionsLoading(false);
  }, []);

  const loadRecipes = useCallback(async (q = '') => {
    setRecipesLoading(true);
    const params = new URLSearchParams({ limit: '24' });
    if (q) params.set('search', q);
    const res = await fetch(`/api/recipes?${params}`);
    if (res.ok) { const data = await res.json(); setRecipes(data.recipes); }
    setRecipesLoading(false);
  }, []);

  const loadShoppingList = useCallback(async () => {
    const res = await fetch('/api/shopping-list');
    if (res.ok) {
      const { lists } = await res.json();
      if (lists.length > 0) { setShoppingListId(lists[0].id); setShoppingItems(lists[0].items ?? []); }
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

  useEffect(() => {
    if (view !== 'app') return;
    const t = setTimeout(() => loadRecipes(search), 400);
    return () => clearTimeout(t);
  }, [search, view, loadRecipes]);

  // Autocomplete ingrédients
  useEffect(() => {
    if (!ingredientQuery || ingredientQuery.length < 2) {
      setIngredientSuggestions([]); setShowDropdown(false); return;
    }
    if (autocompleteTimeout.current) clearTimeout(autocompleteTimeout.current);
    autocompleteTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(ingredientQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setIngredientSuggestions(data.ingredients ?? []);
        setShowDropdown(true);
      }
    }, 250);
  }, [ingredientQuery]);

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
    loadPantry(); loadRecipes(); loadShoppingList();
  };

  const addToPantry = async (name: string) => {
    if (!name.trim()) return;
    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), quantity: null }),
    });
    if (res.ok) {
      const { entry } = await res.json();
      const updated = [entry, ...pantry];
      setPantry(updated);
      loadSuggestions(updated);
      setNewItemName(''); setIngredientQuery(''); setIngredientSuggestions([]);
      setShowDropdown(false); setShowAdd(false);
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

  const saveShoppingList = async (items: ShoppingItem[]) => {
    if (shoppingListId) {
      await fetch(`/api/shopping-list/${shoppingListId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } else {
      const res = await fetch('/api/shopping-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ma liste', items }),
      });
      if (res.ok) { const { list } = await res.json(); setShoppingListId(list.id); }
    }
    setShoppingItems(items);
  };

  const addToShoppingList = async (name: string) => {
    if (!name.trim()) return;
    await saveShoppingList([...shoppingItems, { name: name.trim(), checked: false }]);
    setShoppingInput('');
  };

  const toggleShoppingItem = async (i: number) => {
    await saveShoppingList(shoppingItems.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it));
  };

  const clearChecked = async () => {
    await saveShoppingList(shoppingItems.filter((it) => !it.checked));
  };

  // ── Rendu loading ─────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
      </div>
    );
  }

  // ── Landing ───────────────────────────────────────────────────────────────

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-stone-950 overflow-hidden">
        {/* Fond texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          {/* Nav */}
          <div className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-white text-lg">Cuisine<span className="text-brand-200 font-bold">Connect</span></span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/login')} className="text-stone-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
                Se connecter
              </button>
              <button onClick={() => router.push('/register')} className="btn-primary">
                Commencer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-stone-300 text-xs font-medium mb-8 border border-white/10">
                <Globe className="w-3.5 h-3.5" />
                598 recettes · 27 cuisines du monde
              </div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05]">
                Cuisinez avec<br />
                <span className="text-brand-200">ce que vous avez.</span>
              </h1>
              <p className="text-stone-400 text-xl leading-relaxed mb-10 max-w-lg">
                Votre compagnon culinaire intelligent — gérez votre frigo, découvrez des recettes personnalisées, partagez vos créations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => router.push('/register')} className="btn-primary text-base px-8 py-4">
                  Créer un compte gratuit <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => router.push('/feed')} className="btn-secondary text-base px-8 py-4 bg-white/10 border-white/10 text-white hover:bg-white/20">
                  Explorer les recettes
                </button>
              </div>
            </motion.div>

            {/* Grille photos éditoriale */}
            <motion.div
              className="hidden lg:grid grid-cols-2 gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {[
                { src: 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg', title: 'Jerk Chicken', cuisine: 'Jamaïcaine', tall: true },
                { src: 'https://www.themealdb.com/images/media/meals/ysxwuq1487323065.jpg', title: 'Beef Wellington', cuisine: 'Britannique', tall: false },
                { src: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg', title: 'Shakshuka', cuisine: 'Moyen-Orient', tall: false },
                { src: 'https://www.themealdb.com/images/media/meals/1529442352.jpg', title: 'Sushi', cuisine: 'Japonaise', tall: false },
              ].map((item, i) => (
                <div key={i} className={`relative rounded-2xl overflow-hidden group ${i === 0 ? 'row-span-2' : ''}`}>
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-500"
                    style={{ minHeight: i === 0 ? '320px' : '150px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <p className="text-white font-serif font-semibold text-sm leading-tight">{item.title}</p>
                    <p className="text-white/60 text-[11px]">{item.cuisine}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ── Onboarding objectif ────────────────────────────────────────────────────

  if (view === 'goal') {
    return (
      <div className="min-h-screen bg-canvas-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-3">Bienvenue !</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mb-3">
              {session?.user.name ? `Bonjour, ${session.user.name.split(' ')[0]} !` : 'Bienvenue !'}
            </h2>
            <p className="text-stone-500 text-lg">Quelle cuisine vous inspire le plus ?</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5">
            {GOALS.map((g, i) => (
              <motion.button
                key={g.id}
                onClick={() => !savingGoal && handleSelectGoal(g.id)}
                disabled={savingGoal}
                className="relative rounded-3xl overflow-hidden aspect-[3/4] group text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
              >
                <img
                  src={g.image}
                  alt={g.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  {savingGoal ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin mb-3" />
                  ) : null}
                  <h3 className="font-serif text-2xl font-bold text-white mb-1.5">{g.label}</h3>
                  <p className="text-stone-300 text-sm">{g.desc}</p>
                </div>
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
  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  return (
    <div className="min-h-screen bg-canvas-50">
      <div className="flex">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-canvas-200 h-screen sticky top-0 flex-shrink-0">
          <div className="p-5 flex-1">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-stone-900">Cuisine<span className="text-brand-500 font-bold">Connect</span></span>
            </div>

            {/* Nav */}
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full ${activeTab === item.id ? 'nav-item-active' : 'nav-item'}`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'suggestions' && suggestions.length > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-600'}`}>
                      {suggestions.length}
                    </span>
                  )}
                </button>
              ))}

              <div className="pt-2 mt-2 border-t border-canvas-200">
                <Link href="/feed" className="nav-item w-full flex">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Feed public</span>
                </Link>
              </div>
            </nav>
          </div>

          {/* User card */}
          <div className="p-4 border-t border-canvas-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-white text-sm">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900 text-sm truncate">{userName}</p>
                <p className="text-[11px] text-stone-400 truncate">{goalLabel}</p>
              </div>
              <button
                onClick={() => signOut().then(() => router.push('/login'))}
                className="text-stone-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* ── Header mobile ── */}
          <header className="lg:hidden bg-white px-4 py-3 border-b border-canvas-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 leading-none">Bonjour</p>
                  <p className="font-semibold text-stone-900 text-sm leading-tight">{userName}</p>
                </div>
              </div>
              <Search className="w-5 h-5 text-stone-400" />
            </div>
          </header>

          <main className="p-5 lg:p-8 pb-28 lg:pb-8">
            <div className="max-w-5xl mx-auto">

              {/* ══════════════ FRIGO ══════════════ */}
              <AnimatePresence mode="wait">
              {activeTab === 'fridge' && (
                <motion.div key="fridge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Mon Frigo</p>
                      <h2 className="font-serif text-2xl font-bold text-stone-900">
                        {pantryLoading ? '…' : `${pantry.length} ingrédient${pantry.length !== 1 ? 's' : ''}`}
                      </h2>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="btn-primary">
                      <Plus className="w-4 h-4" /> Ajouter
                    </button>
                  </div>

                  {pantryLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
                  ) : pantry.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
                      <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <ChefHat className="w-8 h-8 text-stone-300" />
                      </div>
                      <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Votre frigo est vide</h3>
                      <p className="text-stone-500 text-sm mb-6">Ajoutez des ingrédients pour obtenir des suggestions de recettes.</p>
                      <button onClick={() => setShowAdd(true)} className="btn-primary">Ajouter un ingrédient</button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {pantry.map((item) => {
                        const cat = CATEGORIES.find((c) => c.id === item.ingredient.category) ?? CATEGORIES[CATEGORIES.length - 1];
                        const Icon = cat.icon;
                        return (
                          <div key={item.id} className="group flex items-center gap-2 bg-white border border-canvas-200 rounded-full pl-3 pr-2 py-2 shadow-card hover:shadow-hover transition-all">
                            <div className={`w-5 h-5 ${cat.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-sm font-medium text-stone-800 capitalize">{item.ingredient.name}</span>
                            <button
                              onClick={() => removeFromPantry(item.id)}
                              className="w-5 h-5 flex items-center justify-center rounded-full text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══════════════ SUGGESTIONS ══════════════ */}
              {activeTab === 'suggestions' && (
                <motion.div key="suggestions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Basé sur votre frigo</p>
                    <h2 className="font-serif text-2xl font-bold text-stone-900">Suggestions</h2>
                    <p className="text-stone-500 text-sm mt-1">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''} en stock</p>
                  </div>

                  {pantry.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
                      <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Lightbulb className="w-8 h-8 text-stone-300" />
                      </div>
                      <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Frigo vide</h3>
                      <p className="text-stone-500 text-sm mb-6">Ajoutez des ingrédients dans votre frigo pour voir des suggestions de recettes.</p>
                      <button onClick={() => setActiveTab('fridge')} className="btn-primary">Remplir mon frigo</button>
                    </div>
                  ) : suggestionsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
                  ) : suggestions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
                      <p className="text-stone-500">Aucune recette trouvée avec vos ingrédients actuels.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {suggestions.map((r) => (
                        <RecipeCard
                          key={r.id}
                          recipe={r}
                          matchScore={r.matchScore}
                          missingIngredients={r.missingIngredients}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══════════════ DÉCOUVRIR ══════════════ */}
              {activeTab === 'recipes' && (
                <motion.div key="recipes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Explorer</p>
                    <h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">Toutes les recettes</h2>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une recette..."
                        className="input-base pl-11 rounded-full"
                      />
                    </div>
                  </div>

                  {recipesLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-canvas-200 animate-pulse shadow-card">
                          <div className="aspect-[4/3] bg-canvas-100" />
                          <div className="p-4 space-y-2">
                            <div className="h-3.5 bg-canvas-100 rounded-full w-3/4" />
                            <div className="h-3 bg-canvas-100 rounded-full w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recipes.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
                      <p className="text-stone-500">Aucune recette trouvée.</p>
                      {search && (
                        <button onClick={() => setSearch('')} className="mt-4 text-brand-500 hover:text-brand-600 text-sm font-medium">
                          Effacer la recherche
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {recipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══════════════ COURSES ══════════════ */}
              {activeTab === 'shopping' && (
                <motion.div key="shopping" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Liste de courses</p>
                      <h2 className="font-serif text-2xl font-bold text-stone-900">
                        {shoppingItems.filter((i) => !i.checked).length} article{shoppingItems.filter((i) => !i.checked).length !== 1 ? 's' : ''} restant{shoppingItems.filter((i) => !i.checked).length !== 1 ? 's' : ''}
                      </h2>
                    </div>
                    {checkedCount > 0 && (
                      <button onClick={clearChecked} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-500 transition-colors">
                        <CheckCheck className="w-4 h-4" /> Effacer cochés ({checkedCount})
                      </button>
                    )}
                  </div>

                  {/* Input ajout */}
                  <div className="flex gap-2 mb-5">
                    <input
                      type="text"
                      value={shoppingInput}
                      onChange={(e) => setShoppingInput(e.target.value)}
                      placeholder="Ajouter un article..."
                      className="input-base rounded-full flex-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') addToShoppingList(shoppingInput); }}
                    />
                    <button onClick={() => addToShoppingList(shoppingInput)} className="btn-primary px-5">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {shoppingItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
                      <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <ShoppingCart className="w-8 h-8 text-stone-300" />
                      </div>
                      <p className="text-stone-500">Votre liste est vide.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden">
                      {/* Non cochés */}
                      {shoppingItems.filter(i => !i.checked).map((item, i) => {
                        const realIdx = shoppingItems.indexOf(item);
                        return (
                          <div key={realIdx} className="flex items-center gap-4 px-5 py-3.5 border-b border-canvas-100 last:border-0 hover:bg-canvas-50 transition-colors group">
                            <button
                              onClick={() => toggleShoppingItem(realIdx)}
                              className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-brand-500 flex-shrink-0 transition-colors"
                            />
                            <span className="text-stone-800 text-sm flex-1">{item.name}</span>
                            <button
                              onClick={() => saveShoppingList(shoppingItems.filter((_, idx) => idx !== realIdx))}
                              className="text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      {/* Cochés */}
                      {shoppingItems.filter(i => i.checked).map((item) => {
                        const realIdx = shoppingItems.indexOf(item);
                        return (
                          <div key={realIdx} className="flex items-center gap-4 px-5 py-3 border-b border-canvas-100 last:border-0 bg-canvas-50 opacity-50 group">
                            <button
                              onClick={() => toggleShoppingItem(realIdx)}
                              className="w-5 h-5 rounded-full bg-brand-500 border-2 border-brand-500 flex-shrink-0 flex items-center justify-center"
                            >
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <span className="text-stone-500 text-sm line-through flex-1">{item.name}</span>
                            <button
                              onClick={() => saveShoppingList(shoppingItems.filter((_, idx) => idx !== realIdx))}
                              className="text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══════════════ PROFIL ══════════════ */}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="max-w-md mx-auto">
                    {/* Hero */}
                    <div className="bg-stone-900 rounded-3xl p-8 text-center mb-5 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
                      />
                      <div className="relative z-10">
                        <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                        </div>
                        <h2 className="font-serif text-2xl font-bold text-white">{userName}</h2>
                        <p className="text-stone-400 text-sm mt-1">{session?.user.email}</p>
                        {goalLabel && <p className="text-brand-200 text-sm font-medium mt-2">{goalLabel}</p>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        { label: 'Ingrédients', value: pantry.length },
                        { label: 'Courses', value: shoppingItems.filter(i => !i.checked).length },
                        { label: 'Suggestions', value: suggestions.length },
                      ].slice(0, 2).map((s) => (
                        <div key={s.label} className="bg-white rounded-2xl p-5 text-center border border-canvas-200 shadow-card">
                          <p className="font-serif text-3xl font-bold text-stone-900">{s.value}</p>
                          <p className="text-xs text-stone-500 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden">
                      <Link href="/feed" className="flex items-center justify-between px-5 py-4 hover:bg-canvas-50 transition-colors border-b border-canvas-100">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-stone-400" />
                          <span className="text-sm font-medium text-stone-700">Explorer les recettes</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-400" />
                      </Link>
                      <Link href="/recipes/new" className="flex items-center justify-between px-5 py-4 hover:bg-canvas-50 transition-colors border-b border-canvas-100">
                        <div className="flex items-center gap-3">
                          <Plus className="w-4 h-4 text-stone-400" />
                          <span className="text-sm font-medium text-stone-700">Créer une recette</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-400" />
                      </Link>
                      <button
                        onClick={() => signOut().then(() => router.push('/login'))}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">Se déconnecter</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

            </div>
          </main>

          {/* ── Nav mobile ── */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-canvas-200 px-2 py-2 safe-area-inset-bottom z-20">
            <div className="flex justify-around">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                    activeTab === item.id ? 'text-brand-500' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
                  {item.id === 'suggestions' && suggestions.length > 0 && (
                    <span className="absolute -top-0.5 right-1.5 w-4 h-4 bg-brand-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {suggestions.length > 9 ? '9+' : suggestions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* ── Modal ajout frigo ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-float"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-lg font-bold text-stone-900">Ajouter un ingrédient</h3>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas-100 transition-colors">
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Input avec autocomplete */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={ingredientQuery}
                  onChange={(e) => { setIngredientQuery(e.target.value); setNewItemName(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { addToPantry(newItemName); } if (e.key === 'Escape') { setShowDropdown(false); } }}
                  placeholder="Ex : tomates cerises, poulet..."
                  className="input-base text-base"
                  autoFocus
                />
                {/* Dropdown suggestions */}
                <AnimatePresence>
                  {showDropdown && ingredientSuggestions.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-canvas-200 shadow-hover overflow-hidden z-10"
                    >
                      {ingredientSuggestions.slice(0, 6).map((s) => {
                        const cat = CATEGORIES.find((c) => c.id === s.category) ?? CATEGORIES[CATEGORIES.length - 1];
                        const Icon = cat.icon;
                        return (
                          <li key={s.id}>
                            <button
                              onClick={() => { setNewItemName(s.name); setIngredientQuery(s.name); setShowDropdown(false); addToPantry(s.name); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas-50 transition-colors text-left"
                            >
                              <div className={`w-7 h-7 ${cat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-sm text-stone-800 capitalize">{s.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Catégories */}
              <div className="flex flex-wrap gap-2 mb-5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setNewItemCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        newItemCategory === cat.id ? 'bg-stone-900 text-white' : 'bg-canvas-100 text-stone-600 hover:bg-canvas-200'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {cat.id}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => addToPantry(newItemName)}
                disabled={!newItemName.trim()}
                className="btn-primary w-full py-3.5 text-base"
              >
                Ajouter au frigo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
