'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Search, 
  User,
  Heart,
  BookOpen,
  ArrowRight,
  X,
  Upload,
  Target,
  Flame,
  Leaf,
  ShoppingCart,
  Sparkles,
  Menu,
  ChevronRight
} from 'lucide-react';

// Types
interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
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
  calories: number;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  tags: string[];
  description?: string;
}

interface UserProfile {
  name: string;
  goal: 'lose' | 'sport' | 'cook' | null;
  avatar: string | null;
}

// Categories
const CATEGORIES: Category[] = [
  { id: 'legumes', name: 'Légumes', icon: <Leaf className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'fruits', name: 'Fruits', icon: <Sparkles className="w-5 h-5" />, color: 'bg-rose-100 text-rose-700' },
  { id: 'viandes', name: 'Viandes', icon: <Flame className="w-5 h-5" />, color: 'bg-orange-100 text-orange-700' },
  { id: 'poissons', name: 'Poissons', icon: <Target className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700' },
  { id: 'laitiers', name: 'Laitiers', icon: <Sparkles className="w-5 h-5" />, color: 'bg-amber-100 text-amber-700' },
  { id: 'epices', name: 'Épices', icon: <Sparkles className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700' },
  { id: 'autres', name: 'Autres', icon: <Sparkles className="w-5 h-5" />, color: 'bg-slate-100 text-slate-700' },
];

// Recettes enrichies
const SAMPLE_RECIPES: Recipe[] = [
  { 
    id: 1, 
    title: 'Pâtes Carbonara Authentiques', 
    time: '20 min', 
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600', 
    likes: 234,
    calories: 650,
    difficulty: 'Facile',
    tags: ['Italien', 'Comfort Food'],
    description: 'La vraie recette romaine avec guanciale, pecorino et œufs.'
  },
  { 
    id: 2, 
    title: 'Salade César Grillée', 
    time: '15 min', 
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600', 
    likes: 189,
    calories: 320,
    difficulty: 'Facile',
    tags: ['Healthy', 'Rapide'],
    description: 'Poulet grillé, croûtons maison et sauce césar crémeuse.'
  },
  { 
    id: 3, 
    title: 'Poulet Curry Madras', 
    time: '30 min', 
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600', 
    likes: 312,
    calories: 480,
    difficulty: 'Moyen',
    tags: ['Indien', 'Épicé'],
    description: 'Un curry parfumé au lait de coco et épices madras.'
  },
  { 
    id: 4, 
    title: 'Saumon Grillé Asiatique', 
    time: '25 min', 
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600', 
    likes: 278,
    calories: 420,
    difficulty: 'Moyen',
    tags: ['Healthy', 'Omega-3'],
    description: 'Saumon laqué au miso avec légumes croquants.'
  },
  { 
    id: 5, 
    title: 'Risotto aux Champignons', 
    time: '35 min', 
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600', 
    likes: 156,
    calories: 580,
    difficulty: 'Difficile',
    tags: ['Italien', 'Végétarien'],
    description: 'Crémeux et réconfortant aux cèpes et parmesan.'
  },
  { 
    id: 6, 
    title: 'Buddha Bowl Équilibré', 
    time: '20 min', 
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600', 
    likes: 423,
    calories: 450,
    difficulty: 'Facile',
    tags: ['Healthy', 'Bowl'],
    description: 'Quinoa, avocat, œuf mollet et légumes de saison.'
  },
];

// Objectifs
const GOALS = [
  { id: 'lose', label: 'Perdre du poids', desc: 'Recettes légères et équilibrées', icon: <Leaf className="w-6 h-6" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'sport', label: 'Performances sportives', desc: 'High protein & énergie', icon: <Flame className="w-6 h-6" />, color: 'from-orange-500 to-red-600' },
  { id: 'cook', label: 'Cuisiner simplement', desc: 'Recettes rapides et délicieuses', icon: <ChefHat className="w-6 h-6" />, color: 'from-rose-500 to-pink-600' },
];

// Animations
const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };
const slideUp = { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -40 } };
const staggerContainer = { animate: { transition: { staggerChildren: 0.1 } } };

// Composant pour desktop navigation
function DesktopNav({ activeTab, setActiveTab, user }: { activeTab: string, setActiveTab: (t: any) => void, user: UserProfile }) {
  const navItems = [
    { id: 'fridge', label: 'Mon Frigo', icon: ChefHat },
    { id: 'recipes', label: 'Recettes', icon: BookOpen },
    { id: 'shopping', label: 'Courses', icon: ShoppingCart },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-8">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800">Cuisine<span className="text-rose-500">Connect</span></h1>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-left ${
                activeTab === item.id 
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/25' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              whileHover={{ x: activeTab === item.id ? 0 : 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && (
                <motion.div layoutId="activeIndicator" className="ml-auto">
                  <ChevronRight className="w-5 h-5" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </nav>

      {/* User Card */}
      <div className="p-6">
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{GOALS.find(g => g.id === user.goal)?.label}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Hero Section Desktop
function DesktopHero({ user, featuredRecipe }: { user: UserProfile, featuredRecipe: Recipe }) {
  return (
    <motion.section 
      className="hidden lg:grid grid-cols-2 gap-12 mb-12"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Left Content */}
      <div className="flex flex-col justify-center">
        <motion.p 
          className="text-sm font-bold tracking-widest text-rose-500 uppercase mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Bonjour {user.name}
        </motion.p>
        <motion.h1 
          className="text-6xl font-bold text-slate-800 leading-[0.95] mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Qu'est-ce qu'on <span className="italic text-rose-500">mange</span> aujourd'hui ?
        </motion.h1>
        <motion.p 
          className="text-xl text-slate-500 mb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Découvrez des recettes adaptées à vos objectifs et aux ingrédients de votre frigo.
        </motion.p>
        <motion.div 
          className="flex gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button className="px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold shadow-lg shadow-rose-500/25 hover:shadow-xl transition-shadow">
            Explorer les recettes
          </button>
          <button className="px-8 py-4 border-2 border-slate-200 text-slate-700 rounded-2xl font-semibold hover:border-rose-500 hover:text-rose-500 transition-colors">
            Mon frigo
          </button>
        </motion.div>
      </div>

      {/* Right Image */}
      <motion.div 
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
          <img 
            src={featuredRecipe.image} 
            alt={featuredRecipe.title}
            className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="text-sm font-bold tracking-widest text-rose-300 uppercase mb-2">Recette du jour</p>
            <h3 className="text-2xl font-bold mb-2">{featuredRecipe.title}</h3>
            <p className="text-white/80">{featuredRecipe.description}</p>
          </div>
        </div>
        
        {/* Floating Badge */}
        <motion.div 
          className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center text-white shadow-xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold italic">{featuredRecipe.time.split(' ')[0]}</p>
            <p className="text-xs uppercase tracking-widest">min</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

// Desktop Recipes Grid
function DesktopRecipesGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <section className="hidden lg:block">
      <motion.div 
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Nos recettes</h2>
          <p className="text-slate-500 mt-1">{recipes.length} recettes adaptées à vos préférences</p>
        </div>
        <button className="flex items-center gap-2 text-rose-500 font-semibold hover:gap-3 transition-all">
          Voir tout <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        {recipes.map((recipe, index) => (
          <motion.div
            key={recipe.id}
            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: index % 3 === 1 ? '40px' : 0 }}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img 
                src={recipe.image} 
                alt={recipe.title}
                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Hover overlay */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
                  <span className="text-xs font-bold text-slate-800">Voir</span>
                </div>
              </motion.div>

              <button className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                <Heart className="w-5 h-5 text-slate-600" />
              </button>

              <div className="absolute top-4 left-4 flex gap-2">
                {recipe.tags.map(tag => (
                  <span key={tag} className="text-xs font-bold bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> {recipe.calories} kcal
                </span>
                <span>{recipe.time}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-rose-500 transition-colors">
                {recipe.title}
              </h3>
              <p className="text-slate-500 text-sm line-clamp-2">{recipe.description}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  recipe.difficulty === 'Facile' ? 'bg-emerald-100 text-emerald-700' :
                  recipe.difficulty === 'Moyen' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {recipe.difficulty}
                </span>
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <Heart className="w-4 h-4" /> {recipe.likes}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Desktop Fridge View
function DesktopFridge({ pantry, onAdd }: { pantry: PantryItem[], onAdd: () => void }) {
  return (
    <motion.div 
      className="hidden lg:block"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="grid grid-cols-3 gap-8">
        {/* Left: Stats & Actions */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <p className="text-sm font-bold tracking-widest text-rose-500 uppercase mb-2">Mon Frigo</p>
            <h2 className="text-5xl font-bold text-slate-800 mb-2">{pantry.length}</h2>
            <p className="text-slate-500">ingrédients disponibles</p>
          </div>

          <motion.button
            onClick={onAdd}
            className="w-full p-6 bg-gradient-to-r from-rose-500 to-amber-500 rounded-3xl text-white text-left shadow-lg shadow-rose-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-8 h-8 mb-4" />
            <p className="text-xl font-bold">Ajouter un ingrédient</p>
            <p className="text-white/80 text-sm mt-1">Enrichissez votre collection</p>
          </motion.button>

          <div className="bg-slate-50 rounded-3xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Catégories</h3>
            <div className="space-y-3">
              {CATEGORIES.slice(0, 5).map(cat => (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <span className="text-slate-600">{cat.name}</span>
                  </div>
                  <span className="text-slate-400 text-sm">
                    {pantry.filter(p => p.category === cat.id).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Grid */}
        <div className="col-span-2">
          {pantry.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="text-center p-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChefHat className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Votre frigo est vide</h3>
                <p className="text-slate-500 mb-6">Ajoutez des ingrédients pour commencer</p>
                <button onClick={onAdd} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold">
                  Ajouter un ingrédient
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {pantry.map((item, index) => {
                const cat = CATEGORIES.find(c => c.id === item.category);
                return (
                  <motion.div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-lg transition-all"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={`w-12 h-12 ${cat?.color} rounded-xl flex items-center justify-center mb-4`}>
                      {cat?.icon}
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">{item.name}</h4>
                    <p className="text-sm text-slate-400">{item.quantity} unité{item.quantity > 1 ? 's' : ''}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [step, setStep] = useState<'onboarding' | 'goal' | 'profile' | 'app'>('onboarding');
  const [user, setUser] = useState<UserProfile>({ name: '', goal: null, avatar: null });
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'fridge' | 'recipes' | 'shopping' | 'profile'>('fridge');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'legumes', quantity: 1 });
  const [shoppingList, setShoppingList] = useState<string[]>([]);

  // Load saved data
  useEffect(() => {
    const savedUser = localStorage.getItem('cc_user');
    const savedPantry = localStorage.getItem('cc_pantry');
    const savedShopping = localStorage.getItem('cc_shopping');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setStep('app');
    }
    if (savedPantry) setPantry(JSON.parse(savedPantry));
    if (savedShopping) setShoppingList(JSON.parse(savedShopping));
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

  const importShoppingList = (text: string) => {
    const items = text.split('\n').filter(line => line.trim());
    setShoppingList(items);
    localStorage.setItem('cc_shopping', JSON.stringify(items));
    setShowImportModal(false);
  };

  // ONBOARDING (Mobile & Desktop)
  if (step === 'onboarding') {
    return (
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-rose-500/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <motion.div className="relative z-10 text-center max-w-2xl" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="mb-8" variants={fadeIn}>
            <motion.div 
              className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-rose-400 to-amber-400 rounded-3xl flex items-center justify-center shadow-2xl"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChefHat className="w-14 h-14 text-white" />
            </motion.div>
            <motion.h1 className="text-5xl lg:text-7xl font-light mb-4 tracking-tight" variants={fadeIn}>
              Cuisine<span className="font-bold">Connect</span>
            </motion.h1>
            <motion.p className="text-lg lg:text-xl text-slate-300 font-light" variants={fadeIn}>
              Votre compagnon culinaire intelligent
            </motion.p>
          </motion.div>

          <motion.div variants={fadeIn}>
            <motion.button 
              onClick={() => setStep('goal')}
              className="group relative px-10 py-5 bg-white text-slate-900 rounded-2xl font-semibold text-lg overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center gap-3">
                Commencer
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // GOAL SELECTION
  if (step === 'goal') {
    return (
      <motion.div className="min-h-screen bg-slate-50 p-6 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div variants={fadeIn} className="text-center mb-10">
            <motion.div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center">
              <Target className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-2">Votre objectif</h2>
            <p className="text-slate-500">Personnalisons votre expérience</p>
          </motion.div>

          <motion.div className="grid lg:grid-cols-3 gap-4" variants={staggerContainer}>
            {GOALS.map((goal) => (
              <motion.button
                key={goal.id}
                onClick={() => { setUser({ ...user, goal: goal.id as any }); setStep('profile'); }}
                className="p-8 rounded-3xl bg-white border-2 transition-all text-left group hover:shadow-xl border-transparent hover:border-rose-200"
                variants={slideUp}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-white shadow-lg mb-6`}>
                  {goal.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-xl mb-2">{goal.label}</h3>
                <p className="text-slate-500">{goal.desc}</p>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // PROFILE
  if (step === 'profile') {
    return (
      <motion.div className="min-h-screen bg-slate-50 p-6 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <motion.div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center shadow-xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}>
              <User className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Comment vous appeler ?</h2>
            <p className="text-slate-500">Ce nom sera visible par la communauté</p>
          </div>

          <motion.div className="bg-white rounded-3xl p-8 shadow-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <label className="block text-sm font-medium text-slate-700 mb-3">Votre pseudo</label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              placeholder="Chef Kenty"
              className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none text-lg transition-all mb-6"
              autoFocus
            />
            <motion.button
              onClick={saveUser}
              disabled={!user.name}
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50 shadow-lg shadow-rose-500/25"
              whileHover={{ scale: user.name ? 1.02 : 1 }}
              whileTap={{ scale: user.name ? 0.98 : 1 }}
            >
              C'est parti !
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop Navigation */}
      <DesktopNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} />

      {/* Main Content */}
      <main className="flex-1 lg:p-8 pb-24 lg:pb-8">
        {/* Mobile Header */}
        <motion.header className="lg:hidden bg-white/80 backdrop-blur-lg px-6 py-4 shadow-sm sticky top-0 z-10 border-b border-slate-100">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Bonjour</p>
                <h1 className="font-bold text-slate-800">{user.name}</h1>
              </div>
            </div>
            <button className="p-3 hover:bg-slate-100 rounded-full transition-colors">
              <Search className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </motion.header>

        {/* Content Container */}
        <div className="lg:max-w-6xl lg:mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'fridge' && (
              <motion.div key="fridge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Desktop Fridge View */}
                <DesktopFridge pantry={pantry} onAdd={() => setShowAddModal(true)} />

                {/* Mobile Fridge View */}
                <div className="lg:hidden p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Mon Frigo</h2>
                    <span className="text-sm text-slate-400 font-medium">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''}</span>
                  </div>

                  {pantry.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <ChefHat className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2">Votre frigo est vide</h3>
                      <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-rose-500 to-amber-500 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 shadow-lg">
                        <Plus className="w-5 h-5" /> Ajouter
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {pantry.map((item, index) => {
                        const cat = CATEGORIES.find(c => c.id === item.category);
                        return (
                          <motion.div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                            <div className={`w-12 h-12 ${cat?.color} rounded-xl flex items-center justify-center mb-3`}>{cat?.icon}</div>
                            <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'recipes' && (
              <motion.div key="recipes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Desktop Hero & Grid */}
                <DesktopHero user={user} featuredRecipe={SAMPLE_RECIPES[0]} />
                <DesktopRecipesGrid recipes={SAMPLE_RECIPES} />

                {/* Mobile Recipes */}
                <div className="lg:hidden p-4 space-y-4">
                  {SAMPLE_RECIPES.map((recipe, index) => (
                    <motion.div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                      <div className="relative h-48">
                        <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 p-2 bg-white/90 rounded-full">
                          <Heart className="w-5 h-5 text-slate-600" />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg">{recipe.title}</h3>
                        <p className="text-sm text-slate-500">{recipe.calories} kcal • {recipe.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[
            { id: 'fridge', label: 'Frigo', icon: ChefHat },
            { id: 'recipes', label: 'Recettes', icon: BookOpen },
            { id: 'shopping', label: 'Courses', icon: ShoppingCart },
            { id: 'profile', label: 'Profil', icon: User },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center p-3 ${activeTab === tab.id ? 'text-rose-500' : 'text-slate-400'}`}>
              <tab.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white w-full lg:max-w-lg lg:rounded-3xl rounded-t-3xl p-6" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Ajouter un ingrédient</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <input type="text" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Nom de l'ingrédient" className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 outline-none text-lg mb-4" autoFocus />
              <div className="grid grid-cols-4 gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setNewItem({ ...newItem, category: cat.id })} className={`p-3 rounded-xl text-center transition-all ${newItem.category === cat.id ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <span className="block mb-1">{cat.icon}</span>
                    <span className="text-xs">{cat.name}</span>
                  </button>
                ))}
              </div>
              <motion.button onClick={addToPantry} disabled={!newItem.name} className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50">
                Ajouter
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
