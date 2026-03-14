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
  Sparkles
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
}

interface UserProfile {
  name: string;
  goal: 'lose' | 'sport' | 'cook' | null;
  avatar: string | null;
}

// Categories sans emojis - design luxe
const CATEGORIES: Category[] = [
  { id: 'legumes', name: 'Légumes', icon: <Leaf className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-700' },
  { id: 'fruits', name: 'Fruits', icon: <Sparkles className="w-5 h-5" />, color: 'bg-rose-100 text-rose-700' },
  { id: 'viandes', name: 'Viandes', icon: <Flame className="w-5 h-5" />, color: 'bg-orange-100 text-orange-700' },
  { id: 'poissons', name: 'Poissons', icon: <Target className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700' },
  { id: 'laitiers', name: 'Laitiers', icon: <Sparkles className="w-5 h-5" />, color: 'bg-amber-100 text-amber-700' },
  { id: 'epices', name: 'Épices', icon: <Sparkles className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700' },
  { id: 'autres', name: 'Autres', icon: <Sparkles className="w-5 h-5" />, color: 'bg-slate-100 text-slate-700' },
];

// Recettes de base luxueuses
const SAMPLE_RECIPES: Recipe[] = [
  { 
    id: 1, 
    title: 'Pâtes Carbonara Authentiques', 
    time: '20 min', 
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', 
    likes: 234,
    calories: 650,
    difficulty: 'Facile',
    tags: ['Italien', 'Comfort Food']
  },
  { 
    id: 2, 
    title: 'Salade César Grillée', 
    time: '15 min', 
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', 
    likes: 189,
    calories: 320,
    difficulty: 'Facile',
    tags: ['Healthy', 'Rapide']
  },
  { 
    id: 3, 
    title: 'Poulet Curry Madras', 
    time: '30 min', 
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', 
    likes: 312,
    calories: 480,
    difficulty: 'Moyen',
    tags: ['Indien', 'Épicé']
  },
  { 
    id: 4, 
    title: 'Saumon Grillé Asiatique', 
    time: '25 min', 
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', 
    likes: 278,
    calories: 420,
    difficulty: 'Moyen',
    tags: ['Healthy', 'Omega-3']
  },
  { 
    id: 5, 
    title: 'Risotto aux Champignons', 
    time: '35 min', 
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400', 
    likes: 156,
    calories: 580,
    difficulty: 'Difficile',
    tags: ['Italien', 'Végétarien']
  },
  { 
    id: 6, 
    title: 'Buddha Bowl Équilibré', 
    time: '20 min', 
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', 
    likes: 423,
    calories: 450,
    difficulty: 'Facile',
    tags: ['Healthy', 'Bowl']
  },
];

// Objectifs
const GOALS = [
  { id: 'lose', label: 'Perdre du poids', desc: 'Recettes légères et équilibrées', icon: <Leaf className="w-6 h-6" />, color: 'from-emerald-500 to-teal-600' },
  { id: 'sport', label: 'Performances sportives', desc: 'High protein & énergie', icon: <Flame className="w-6 h-6" />, color: 'from-orange-500 to-red-600' },
  { id: 'cook', label: 'Cuisiner simplement', desc: 'Recettes rapides et délicieuses', icon: <ChefHat className="w-6 h-6" />, color: 'from-rose-500 to-pink-600' },
];

// Animations
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -40 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

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

  // ONBOARDING LUXE
  if (step === 'onboarding') {
    return (
      <motion.div 
        className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background animated elements */}
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

        <motion.div 
          className="relative z-10 text-center max-w-md"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div 
            className="mb-8"
            variants={fadeIn}
          >
            <motion.div 
              className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-rose-400 to-amber-400 rounded-3xl flex items-center justify-center shadow-2xl"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChefHat className="w-14 h-14 text-white" />
            </motion.div>
            
            <motion.h1 
              className="text-5xl font-light mb-4 tracking-tight"
              variants={fadeIn}
            >
              Cuisine
              <span className="font-bold">Connect</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg text-slate-300 font-light"
              variants={fadeIn}
            >
              Votre compagnon culinaire intelligent
            </motion.p>
          </motion.div>

          <motion.div
            variants={fadeIn}
          >
            <motion.button 
              onClick={() => setStep('goal')}
              className="group relative px-10 py-5 bg-white text-slate-900 rounded-2xl font-semibold text-lg overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center gap-3">
                Commencer
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-rose-100 to-amber-100 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // CHOIX DE L'OBJECTIF
  if (step === 'goal') {
    return (
      <motion.div 
        className="min-h-screen bg-slate-50 p-6 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeIn} className="text-center mb-10">
            <motion.div 
              className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center"
              whileHover={{ rotate: 10 }}
            >
              <Target className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Votre objectif</h2>
            <p className="text-slate-500">Personnalisons votre expérience</p>
          </motion.div>

          <motion.div className="space-y-4" variants={staggerContainer}>
            {GOALS.map((goal) => (
              <motion.button
                key={goal.id}
                onClick={() => { setUser({ ...user, goal: goal.id as any }); setStep('profile'); }}
                className={`w-full p-6 rounded-2xl bg-white border-2 transition-all text-left group hover:shadow-xl ${
                  user.goal === goal.id ? 'border-rose-500 shadow-lg' : 'border-transparent'
                }`}
                variants={slideUp}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center text-white shadow-lg`}>
                    {goal.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg">{goal.label}</h3>
                    <p className="text-slate-500 text-sm">{goal.desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-rose-500 transition-colors" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // PROFIL
  if (step === 'profile') {
    return (
      <motion.div 
        className="min-h-screen bg-slate-50 p-6 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <motion.div 
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center shadow-xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <User className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Comment vous appeler ?</h2>
            <p className="text-slate-500">Ce nom sera visible par la communauté</p>
          </div>

          <motion.div 
            className="bg-white rounded-3xl p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Votre pseudo
            </label>
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
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/25"
              whileHover={{ scale: user.name ? 1.02 : 1 }}
              whileTap={{ scale: user.name ? 0.98 : 1 }}
            >
              C&apos;est parti !
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-lg px-6 py-4 shadow-sm sticky top-0 z-10 border-b border-slate-100"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
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

      {/* Content */}
      <main className="p-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'fridge' && (
            <motion.div 
              key="fridge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Mon Frigo</h2>
                <span className="text-sm text-slate-400 font-medium">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''}</span>
              </div>

              {pantry.length === 0 ? (
                <motion.div 
                  className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-5">
                    <ChefHat className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">Votre frigo est vide</h3>
                  <p className="text-slate-500 mb-6">Ajoutez des ingrédients pour découvrir des recettes</p>
                  <motion.button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-rose-500 to-amber-500 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 shadow-lg shadow-rose-500/25"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter
                  </motion.button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {pantry.map((item, index) => {
                    const cat = CATEGORIES.find(c => c.id === item.category);
                    return (
                      <motion.div 
                        key={item.id} 
                        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <button
                          onClick={() => removeFromPantry(item.id)}
                          className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        <div className={`w-12 h-12 ${cat?.color} rounded-xl flex items-center justify-center mb-3`}>
                          {cat?.icon}
                        </div>
                        <p className="font-semibold text-sm text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.quantity} unité{item.quantity > 1 ? 's' : ''}</p>
                      </motion.div>
                    );
                  })}
                  
                  <motion.button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-rose-50 border-2 border-dashed border-rose-200 rounded-2xl p-4 flex flex-col items-center justify-center text-rose-500 min-h-[120px] hover:bg-rose-100 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-8 h-8 mb-1" />
                    <span className="text-sm font-medium">Ajouter</span>
                  </motion.button>
                </div>
              )}

              {/* Quick Actions */}
              <motion.div 
                className="mt-6 flex gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-slate-800">Importer</p>
                    <p className="text-xs text-slate-400">Liste de courses</p>
                  </div>
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'recipes' && (
            <motion.div 
              key="recipes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Recettes</h2>
                <span className="text-sm text-slate-400">{SAMPLE_RECIPES.length} disponibles</span>
              </div>
              
              <div className="space-y-4">
                {SAMPLE_RECIPES.map((recipe, index) => (
                  <motion.div 
                    key={recipe.id} 
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="relative h-48">
                      <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex gap-2 mb-2">
                          {recipe.tags.map(tag => (
                            <span key={tag} className="text-xs bg-white/90 px-2 py-1 rounded-lg font-medium">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <motion.button 
                        className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-lg"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart className="w-5 h-5 text-slate-600" />
                      </motion.button>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-slate-800 mb-2">{recipe.title}</h3>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-slate-500">
                          <span className="flex items-center gap-1">
                            <Flame className="w-4 h-4" /> {recipe.calories} kcal
                          </span>
                          <span>{recipe.time}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                          recipe.difficulty === 'Facile' ? 'bg-green-100 text-green-700' :
                          recipe.difficulty === 'Moyen' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {recipe.difficulty}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div 
              key="shopping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Liste de courses</h2>
                <motion.button
                  onClick={() => setShowImportModal(true)}
                  className="text-sm text-rose-500 font-medium flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <Upload className="w-4 h-4" /> Importer
                </motion.button>
              </div>

              {shoppingList.length === 0 ? (
                <motion.div 
                  className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-5">
                    <ShoppingCart className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">Liste vide</h3>
                  <p className="text-slate-500 mb-6">Importez votre liste de courses</p>
                  <motion.button 
                    onClick={() => setShowImportModal(true)}
                    className="bg-gradient-to-r from-rose-500 to-amber-500 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 shadow-lg shadow-rose-500/25"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Upload className="w-5 h-5" />
                    Importer
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div 
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {shoppingList.map((item, index) => (
                    <motion.div 
                      key={index}
                      className="flex items-center gap-3 p-4 border-b border-slate-100 last:border-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0" />
                      <span className="flex-1 text-slate-700">{item}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <motion.div 
                className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <span className="text-3xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                <p className="text-slate-500 mt-1">
                  {GOALS.find(g => g.id === user.goal)?.label}
                </p>
                
                <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{pantry.length}</p>
                    <p className="text-sm text-slate-400">Ingrédients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">0</p>
                    <p className="text-sm text-slate-400">Recettes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{shoppingList.length}</p>
                    <p className="text-sm text-slate-400">À acheter</p>
                  </div>
                </div>
              </motion.div>

              <motion.button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full bg-white p-4 rounded-2xl text-red-500 font-medium shadow-sm border border-slate-100"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Réinitialiser l&apos;application
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Ingredient Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white w-full rounded-t-3xl p-6 max-w-md mx-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Ajouter un ingrédient</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Nom de l&apos;ingrédient"
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none text-lg mb-6 transition-all"
                autoFocus
              />

              <p className="text-sm font-medium text-slate-700 mb-3">Catégorie</p>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewItem({ ...newItem, category: cat.id })}
                    className={`p-3 rounded-xl text-center transition-all ${
                      newItem.category === cat.id 
                        ? 'bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="block mb-1">{cat.icon}</span>
                    <span className="text-xs">{cat.name}</span>
                  </button>
                ))}
              </div>

              <motion.button
                onClick={addToPantry}
                disabled={!newItem.name}
                className="w-full bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-rose-500/25"
                whileHover={{ scale: newItem.name ? 1.02 : 1 }}
                whileTap={{ scale: newItem.name ? 0.98 : 1 }}
              >
                Ajouter
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Shopping List Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div 
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white w-full rounded-t-3xl p-6 max-w-md mx-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Importer liste de courses</h3>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">Collez votre liste (un item par ligne)</p>
              
              <textarea
                className="w-full h-40 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none resize-none mb-4"
                placeholder="Exemple :
Pommes
Lait
Oeufs
Farine"
                onChange={(e) => {
                  if (e.target.value) importShoppingList(e.target.value);
                }}
              />

              <motion.button
                onClick={() => setShowImportModal(false)}
                className="w-full bg-slate-100 text-slate-700 py-4 rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Annuler
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-4 py-2 z-40"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[
            { id: 'fridge', label: 'Frigo', icon: ChefHat },
            { id: 'recipes', label: 'Recettes', icon: BookOpen },
            { id: 'shopping', label: 'Courses', icon: ShoppingCart },
            { id: 'profile', label: 'Profil', icon: User },
          ].map((tab) => (
            <motion.button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${activeTab === tab.id ? 'text-rose-500' : 'text-slate-400'}`}
              whileTap={{ scale: 0.9 }}
            >
              <tab.icon className={`w-6 h-6 mb-1 ${activeTab === tab.id ? 'text-rose-500' : ''}`} />
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  className="absolute bottom-1 w-1 h-1 bg-rose-500 rounded-full"
                  layoutId="tabIndicator"
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.nav>
    </div>
  );
}
