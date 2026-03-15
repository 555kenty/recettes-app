'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Loader2, Leaf, Apple, Fish, Milk, FlaskConical, ChefHat,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PantryEntry {
  id: string;
  quantity: string | null;
  ingredient: { id: string; name: string; category: string | null };
}

interface IngredientSuggestion {
  id: string;
  name: string;
  category: string | null;
}

// ─── Constantes ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'Légumes',  icon: Leaf,          color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Fruits',   icon: Apple,         color: 'bg-rose-100 text-rose-700' },
  { id: 'Viandes',  icon: Leaf,          color: 'bg-orange-100 text-orange-700' },
  { id: 'Poissons', icon: Fish,          color: 'bg-blue-100 text-blue-700' },
  { id: 'Laitiers', icon: Milk,          color: 'bg-amber-100 text-amber-700' },
  { id: 'Épices',   icon: FlaskConical,  color: 'bg-purple-100 text-purple-700' },
  { id: 'Autre',    icon: Leaf,          color: 'bg-stone-100 text-stone-600' },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FridgePage() {
  const [pantry, setPantry] = useState<PantryEntry[]>([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Légumes');
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteTimeout = useRef<NodeJS.Timeout | null>(null);

  // ── Load pantry ──────────────────────────────────────────────────────────

  const loadPantry = useCallback(async () => {
    setPantryLoading(true);
    const res = await fetch('/api/pantry');
    if (res.ok) {
      const { pantry } = await res.json();
      setPantry(pantry);
    }
    setPantryLoading(false);
  }, []);

  useEffect(() => {
    loadPantry();
  }, [loadPantry]);

  // ── Autocomplete ─────────────────────────────────────────────────────────

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

  // ── Actions ──────────────────────────────────────────────────────────────

  const addToPantry = async (name: string) => {
    if (!name.trim()) return;
    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), quantity: null }),
    });
    if (res.ok) {
      const { entry } = await res.json();
      setPantry((prev) => [entry, ...prev]);
      setNewItemName(''); setIngredientQuery(''); setIngredientSuggestions([]);
      setShowDropdown(false); setShowAdd(false);
    }
  };

  const removeFromPantry = async (id: string) => {
    const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPantry((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Mon Frigo</p>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              {pantryLoading ? '...' : `${pantry.length} ingrédient${pantry.length !== 1 ? 's' : ''}`}
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
                        const SugIcon = cat.icon;
                        return (
                          <li key={s.id}>
                            <button
                              onClick={() => { setNewItemName(s.name); setIngredientQuery(s.name); setShowDropdown(false); addToPantry(s.name); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas-50 transition-colors text-left"
                            >
                              <div className={`w-7 h-7 ${cat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <SugIcon className="w-3.5 h-3.5" />
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
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setNewItemCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        newItemCategory === cat.id ? 'bg-stone-900 text-white' : 'bg-canvas-100 text-stone-600 hover:bg-canvas-200'
                      }`}
                    >
                      <CatIcon className="w-3 h-3" />
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
    </>
  );
}
