'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Loader2, Leaf, Apple, Fish, Milk, FlaskConical, ChefHat,
  Lightbulb, ArrowRight, Heart, Activity,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useToast, ToastContainer } from '@/app/components/Toast';
import { getIngredientEmoji } from '@/lib/ingredient-emoji';

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

interface NutritionDaily {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  targets: { calories: number; proteins: number; fats: number; carbs: number };
  tdee: number;
  goal: string | null;
  imc?: number | null;
  imcStatus?: string | null;
}

interface RecipeSuggestion {
  id: string;
  title: string;
  imageUrl?: string | null;
  cuisineType?: string | null;
  calories?: number | null;
  matchScore: number;
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


function getImcStatus(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'MAIGREUR', color: 'bg-blue-100 text-blue-700' };
  if (imc < 25)   return { label: 'NORMAL',   color: 'bg-olive-100 text-olive-700' };
  if (imc < 30)   return { label: 'SURPOIDS', color: 'bg-honey-100 text-honey-700' };
  return { label: 'OBÉSITÉ', color: 'bg-brand-100 text-brand-600' };
}

function MacroBar({
  label,
  value,
  target,
  unit,
  barColor,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  barColor: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-warm-700">{label}</span>
        <span className="text-xs text-stone-500">
          {Math.round(value)} / {Math.round(target)}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-canvas-200 relative overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FridgePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toasts, showToast, dismiss } = useToast();

  // Pantry state
  const [pantry, setPantry] = useState<PantryEntry[]>([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Légumes');
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteTimeout = useRef<NodeJS.Timeout | null>(null);

  // Nutrition + suggestions state
  const [nutrition, setNutrition] = useState<NutritionDaily | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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

  // ── Load nutrition ───────────────────────────────────────────────────────

  const loadNutrition = useCallback(async () => {
    setNutritionLoading(true);
    try {
      const [dailyRes, profileRes] = await Promise.all([
        fetch('/api/nutrition/daily'),
        session?.user?.id ? fetch(`/api/users/${session.user.id}`) : Promise.resolve(null),
      ]);

      let imc: number | null = null;
      if (profileRes?.ok) {
        const { user } = await profileRes.json();
        const w = user?.profile?.weight;
        const h = user?.profile?.height;
        if (w && h) imc = Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
      }

      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setNutrition({
          calories: data.consumed?.kcal ?? 0,
          proteins: data.consumed?.proteins ?? 0,
          fats: data.consumed?.fats ?? 0,
          carbs: data.consumed?.carbs ?? 0,
          targets: {
            calories: data.target?.kcal ?? 2000,
            proteins: data.target?.proteins ?? 150,
            fats: data.target?.fats ?? 70,
            carbs: data.target?.carbs ?? 250,
          },
          tdee: data.target?.kcal ?? 2000,
          goal: data.goal ?? null,
          imc,
          imcStatus: null,
        });
      }
    } catch {}
    setNutritionLoading(false);
  }, [session?.user?.id]);

  // ── Load suggestions ─────────────────────────────────────────────────────

  const loadSuggestions = useCallback(async (pantryItems: string[]) => {
    if (pantryItems.length === 0) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/recipes/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pantryItems }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data.recipes ?? []).slice(0, 3));
      }
    } catch {}
    setSuggestionsLoading(false);
  }, []);

  useEffect(() => {
    loadPantry();
    loadNutrition();
  }, [loadPantry, loadNutrition]);

  useEffect(() => {
    if (!pantryLoading && pantry.length > 0) {
      loadSuggestions(pantry.map((p) => p.ingredient.name));
    }
  }, [pantryLoading, pantry, loadSuggestions]);

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

  const removeFromPantry = async (id: string, name?: string) => {
    const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPantry((prev) => prev.filter((p) => p.id !== id));
      showToast(name ? `"${name}" retiré du frigo` : 'Ingrédient retiré', 'success');
    } else {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  // ── Computed values ───────────────────────────────────────────────────────

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Chef';

  const imcValue = nutrition?.imc ?? null;
  const imcStatus = imcValue ? getImcStatus(imcValue) : null;

  const remainingKcal = nutrition
    ? Math.max(0, nutrition.targets.calories - nutrition.calories)
    : null;

  const topSuggestion = suggestions[0] ?? null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6 pb-10"
      >
        {/* ── Header de bienvenue ── */}
        <div>
          <h1 className="font-serif text-[28px] font-bold text-night leading-tight">
            Bienvenue, {firstName}.
          </h1>
          <p className="text-stone-500 text-sm mt-1 font-sans">
            Prêt à concocter votre prochain chef-d'œuvre nutritionnel ?
          </p>
        </div>

        {/* ── Card Profil Santé ── */}
        <div className="bg-canvas-100 border border-canvas-200 rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-olive-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-olive-500" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-olive-500">
              Profil Santé
            </span>
          </div>

          {nutritionLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 bg-canvas-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : nutrition ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                {imcValue ? (
                  <>
                    <div className="flex items-end gap-2">
                      <span className="font-serif text-4xl font-bold text-night">
                        {imcValue.toFixed(1)}
                      </span>
                      <span className="text-xs text-stone-400 mb-1">IMC</span>
                    </div>
                    {imcStatus && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${imcStatus.color}`}>
                        {imcStatus.label}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-stone-400 italic">IMC non disponible</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-night font-sans">
                  {nutrition.tdee > 0 ? nutrition.tdee : '—'}{' '}
                  <span className="text-sm text-stone-400 font-normal">kcal/j</span>
                </p>
                <p className="text-xs text-stone-400 mt-0.5">TDEE</p>
                {nutrition.goal && (
                  <p className="text-xs font-semibold text-brand-500 mt-2 capitalize">
                    {nutrition.goal}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic">
              Configurez votre profil pour voir vos données de santé.
            </p>
          )}
        </div>

        {/* ── Card Macros du jour ── */}
        <div className="bg-canvas-100 border border-canvas-200 rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-honey-100 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-honey-500" />
              </div>
              <span className="font-serif text-base font-bold text-night">Macros du jour</span>
            </div>
            <span className="text-[11px] text-stone-400">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          {nutritionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 bg-canvas-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : nutrition ? (
            <div className="space-y-3">
              <MacroBar
                label="Calories"
                value={nutrition.calories}
                target={nutrition.targets.calories}
                unit=" kcal"
                barColor="bg-brand-500"
              />
              <MacroBar
                label="Protéines"
                value={nutrition.proteins}
                target={nutrition.targets.proteins}
                unit="g"
                barColor="bg-olive-500"
              />
              <MacroBar
                label="Lipides"
                value={nutrition.fats}
                target={nutrition.targets.fats}
                unit="g"
                barColor="bg-honey-500"
              />
              <MacroBar
                label="Glucides"
                value={nutrition.carbs}
                target={nutrition.targets.carbs}
                unit="g"
                barColor="bg-warm-700"
              />
            </div>
          ) : (
            <p className="text-sm text-stone-400 italic">
              Aucune donnée nutritionnelle pour aujourd'hui.
            </p>
          )}
        </div>

        {/* ── Card Conseil du Chef IA ── */}
        {(nutrition || topSuggestion) && (
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4 text-brand-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-1">
                  Conseil du Chef
                </p>
                <p className="text-sm text-warm-700 leading-relaxed">
                  {remainingKcal !== null && topSuggestion ? (
                    <>
                      Il vous reste{' '}
                      <span className="font-semibold text-brand-500">{remainingKcal} kcal</span>{' '}
                      pour aujourd'hui —{' '}
                      <span className="font-medium">{topSuggestion.title}</span> serait parfaite
                      pour équilibrer vos apports !
                    </>
                  ) : remainingKcal !== null ? (
                    <>
                      Il vous reste{' '}
                      <span className="font-semibold text-brand-500">{remainingKcal} kcal</span>{' '}
                      pour aujourd'hui. Ajoutez des ingrédients à votre frigo pour obtenir des
                      suggestions personnalisées.
                    </>
                  ) : topSuggestion ? (
                    <>
                      Basé sur votre frigo,{' '}
                      <span className="font-medium">{topSuggestion.title}</span> correspond
                      parfaitement à vos ingrédients !
                    </>
                  ) : (
                    'Ajoutez des ingrédients à votre frigo pour recevoir des conseils personnalisés.'
                  )}
                </p>
                {topSuggestion && (
                  <button
                    onClick={() => router.push(`/recipes/${topSuggestion.id}`)}
                    className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-xl px-3 py-2 text-xs font-semibold shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Voir la recette <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section Mon Frigo ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl font-bold text-night">Mon Frigo</h2>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 text-brand-500 text-xs font-semibold hover:text-brand-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Gérer
            </button>
          </div>

          {pantryLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            </div>
          ) : pantry.length === 0 ? (
            <div className="bg-canvas-100 border border-canvas-200 rounded-2xl p-8 text-center shadow-card">
              <div className="w-12 h-12 bg-canvas-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-6 h-6 text-stone-300" />
              </div>
              <p className="text-stone-500 text-sm mb-4">Votre frigo est vide</p>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                Ajouter un ingrédient
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {pantry.map((item) => {
                const emoji = getIngredientEmoji(item.ingredient.name, item.ingredient.category);
                return (
                  <div
                    key={item.id}
                    className="group bg-canvas-100 border border-canvas-200 rounded-xl p-2 text-center relative"
                  >
                    <span className="text-lg block mb-0.5">{emoji}</span>
                    <p className="text-[11px] font-medium text-warm-700 capitalize leading-tight truncate">
                      {item.ingredient.name}
                    </p>
                    {item.quantity && (
                      <p className="text-[10px] text-stone-400 truncate">{item.quantity}</p>
                    )}
                    <button
                      onClick={() => removeFromPantry(item.id, item.ingredient.name)}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {/* Quick add tile */}
              <button
                onClick={() => setShowAdd(true)}
                className="bg-canvas-50 border border-dashed border-canvas-200 rounded-xl p-2 text-center hover:border-brand-300 hover:bg-brand-500/5 transition-all"
              >
                <span className="text-lg block mb-0.5 text-stone-300">+</span>
                <p className="text-[11px] text-stone-400">Ajouter</p>
              </button>
            </div>
          )}
        </div>

        {/* ── Section Suggestions ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-serif text-xl font-bold text-night">Suggestions</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-olive-100 text-olive-500 rounded-full">
              Basé sur votre frigo
            </span>
          </div>

          {suggestionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-canvas-100 rounded-xl animate-pulse border border-canvas-200" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-canvas-100 border border-canvas-200 rounded-2xl p-6 text-center shadow-card">
              <p className="text-stone-400 text-sm">
                {pantry.length === 0
                  ? 'Ajoutez des ingrédients pour obtenir des suggestions.'
                  : 'Aucune suggestion disponible pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {suggestions.map((recipe) => {
                const score = Math.round(recipe.matchScore * 100);
                const scoreColor =
                  score >= 80
                    ? 'bg-olive-500 text-white'
                    : score >= 60
                    ? 'bg-honey-500 text-white'
                    : 'bg-brand-500 text-white';
                return (
                  <motion.button
                    key={recipe.id}
                    onClick={() => router.push(`/recipes/${recipe.id}`)}
                    className="w-full flex items-center gap-3 bg-canvas-100 border border-canvas-200 rounded-xl p-3 hover:shadow-card transition-all text-left"
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Image ou emoji */}
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-canvas-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🍽️</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-night truncate">{recipe.title}</p>
                      <p className="text-[11px] text-stone-400 truncate">
                        {[recipe.cuisineType, recipe.calories ? `${recipe.calories} kcal` : null]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>

                    {/* Score badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${scoreColor}`}>
                      {score}%
                    </div>

                    <ArrowRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
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
                className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-xl px-4 py-3 font-semibold shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
