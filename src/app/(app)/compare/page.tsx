'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, Plus, ChefHat, Scale, Flame, Beef, Droplets, Wheat } from 'lucide-react';
import Link from 'next/link';
import { NutritionCompareChart, type CompareRecipe } from '@/app/components/NutritionCompareChart';
import type { NutritionResult } from '@/lib/nutrition';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeSearchResult {
  id: string;
  title: string;
  imageUrl: string | null;
  timeMinutes: number | null;
  cuisineType: string | null;
}

interface SelectedRecipe extends CompareRecipe {
  imageUrl: string | null;
  loading: boolean;
}

// ─── Macro config ─────────────────────────────────────────────────────────────

const MACROS = [
  { key: 'kcal' as const,     label: 'Calories',  unit: 'kcal', icon: Flame,    color: 'text-orange-500', bg: 'bg-orange-50',   border: 'border-orange-200' },
  { key: 'proteins' as const, label: 'Protéines', unit: 'g',    icon: Beef,     color: 'text-blue-500',   bg: 'bg-blue-50',     border: 'border-blue-200' },
  { key: 'fats' as const,     label: 'Lipides',   unit: 'g',    icon: Droplets, color: 'text-amber-500',  bg: 'bg-amber-50',    border: 'border-amber-200' },
  { key: 'carbs' as const,    label: 'Glucides',  unit: 'g',    icon: Wheat,    color: 'text-emerald-500',bg: 'bg-emerald-50',  border: 'border-emerald-200' },
] as const;

const RECIPE_COLORS = ['#f97316', '#3b82f6', '#10b981'];

// ─── Search component ─────────────────────────────────────────────────────────

function RecipeSearchSelect({
  onSelect,
  excludeIds,
  disabled,
}: {
  onSelect: (recipe: RecipeSearchResult) => void;
  excludeIds: string[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setFetching(true);
    fetch(`/api/recipes?search=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        setResults((data.recipes ?? []).filter((r: RecipeSearchResult) => !excludeIds.includes(r.id)));
        setOpen(true);
      })
      .finally(() => setFetching(false));
  }, [excludeIds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (r: RecipeSearchResult) => {
    onSelect(r);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Rechercher une recette…"
          className="input-base pl-9 w-full disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {fetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl border border-canvas-200 shadow-xl overflow-hidden"
          >
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-canvas-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                      : <ChefHat className="w-5 h-5 text-stone-400 m-2.5" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{r.title}</p>
                    {r.cuisineType && <p className="text-xs text-stone-400">{r.cuisineType}</p>}
                  </div>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [selected, setSelected] = useState<SelectedRecipe[]>([]);
  const [perServing, setPerServing] = useState(true);

  const addRecipe = async (r: RecipeSearchResult) => {
    if (selected.length >= 3) return;
    const placeholder: SelectedRecipe = {
      id: r.id, title: r.title, imageUrl: r.imageUrl, loading: true,
      nutrition: { kcal: 0, proteins: 0, fats: 0, carbs: 0, perServing: { kcal: 0, proteins: 0, fats: 0, carbs: 0 }, matchedCount: 0 },
    };
    setSelected((prev) => [...prev, placeholder]);

    try {
      const res = await fetch(`/api/recipes/${r.id}/nutrition`);
      if (!res.ok) throw new Error();
      const nutrition: NutritionResult = await res.json();
      setSelected((prev) => prev.map((s) => s.id === r.id ? { ...s, nutrition, loading: false } : s));
    } catch {
      setSelected((prev) => prev.map((s) => s.id === r.id ? { ...s, loading: false } : s));
    }
  };

  const removeRecipe = (id: string) => setSelected((prev) => prev.filter((r) => r.id !== id));

  const getNutritionValue = (recipe: SelectedRecipe, key: typeof MACROS[number]['key']) => {
    if (recipe.loading) return '—';
    const src = perServing ? recipe.nutrition.perServing : recipe.nutrition;
    return src[key];
  };

  return (
    <div className="min-h-screen bg-canvas-50">
      {/* Header */}
      <div className="bg-white border-b border-canvas-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/discover"
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="h-4 w-px bg-canvas-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-stone-900 text-sm leading-none">Comparateur</h1>
              <p className="text-[11px] text-stone-400">Jusqu&apos;à 3 recettes</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-stone-500">Par portion</span>
            <button
              onClick={() => setPerServing((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${perServing ? 'bg-brand-500' : 'bg-stone-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${perServing ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs text-stone-500">Total</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Search */}
        <div className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5">
          <p className="text-sm font-semibold text-stone-700 mb-3">
            Ajouter une recette {selected.length > 0 && <span className="text-stone-400 font-normal">({selected.length}/3)</span>}
          </p>
          <RecipeSearchSelect
            onSelect={addRecipe}
            excludeIds={selected.map((r) => r.id)}
            disabled={selected.length >= 3}
          />
          {selected.length >= 3 && (
            <p className="text-xs text-stone-400 mt-2">Maximum 3 recettes atteint. Supprimez une recette pour en ajouter une autre.</p>
          )}
        </div>

        {/* Selected recipes cards */}
        <AnimatePresence>
          {selected.length > 0 && (
            <div className={`grid gap-4 ${selected.length === 1 ? 'grid-cols-1 max-w-xs' : selected.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {selected.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden"
                >
                  {/* Recipe image */}
                  <div className="relative h-32 bg-stone-100">
                    {r.imageUrl
                      ? <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full"><ChefHat className="w-8 h-8 text-stone-300" /></div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
                    <button
                      onClick={() => removeRecipe(r.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors border border-white/20"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: RECIPE_COLORS[i] }} />
                        <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Recette {i + 1}</span>
                      </div>
                      <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{r.title}</p>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="p-4 space-y-2">
                    {r.loading ? (
                      Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-8 bg-canvas-100 rounded-xl animate-pulse" />
                      ))
                    ) : (
                      MACROS.map(({ key, label, unit, icon: Icon, color, bg, border }) => (
                        <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-xl ${bg} border ${border}`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                            <span className="text-xs text-stone-600">{label}</span>
                          </div>
                          <span className={`text-sm font-bold ${color}`}>
                            {getNutritionValue(r, key)}{typeof getNutritionValue(r, key) === 'number' ? ` ${unit}` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {selected.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-stone-300" />
            </div>
            <p className="text-stone-500 font-medium mb-1">Aucune recette sélectionnée</p>
            <p className="text-stone-400 text-sm">Recherchez des recettes ci-dessus pour comparer leurs apports nutritionnels</p>
          </motion.div>
        )}

        {/* Chart */}
        <AnimatePresence>
          {selected.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-lg font-bold text-stone-900">Comparaison graphique</h2>
                  <p className="text-xs text-stone-400 mt-0.5">{perServing ? 'Par portion' : 'Total de la recette'}</p>
                </div>
              </div>
              <NutritionCompareChart
                recipes={selected.filter((r) => !r.loading)}
                perServing={perServing}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add more CTA */}
        {selected.length === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-100 rounded-2xl"
          >
            <div className="w-8 h-8 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-brand-600" />
            </div>
            <p className="text-sm text-brand-700">Ajoutez une 2e recette pour voir le graphique comparatif</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
