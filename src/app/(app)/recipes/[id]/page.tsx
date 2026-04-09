'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, Clock, Users, Send, Trash2, ChefHat,
  CheckCircle2, ShoppingCart, Share2, Loader2, Minus, Plus,
  Zap, CheckSquare,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { StoresNearby } from '@/app/components/StoresNearby';
import { useToast, ToastContainer } from '@/app/components/Toast';
import type { NutritionResult } from '@/lib/nutrition';

// ─── Emoji helper ────────────────────────────────────────────────────────────

function getIngredientEmoji(name: string, category?: string): string {
  const n = (name ?? '').toLowerCase();
  if (category === 'Viandes')  return '🍗';
  if (category === 'Légumes')  return '🥕';
  if (category === 'Fruits')   return '🍋';
  if (category === 'Poissons') return '🐟';
  if (category === 'Laitiers') return '🥛';
  if (category === 'Épices')   return '🧂';

  // Viandes & protéines
  if (/poulet|volaille|blanc.*poulet|cuisse.*poulet/.test(n)) return '🍗';
  if (/boeuf|veau|steak|viande hach/.test(n)) return '🥩';
  if (/agneau|mouton/.test(n)) return '🫕';
  if (/porc|jambon|lardon|bacon|saucisse|merguez/.test(n)) return '🥓';
  if (/crevette|homard|crabe|fruits.de.mer/.test(n)) return '🦐';
  if (/thon|saumon|cabillaud|tilapia|poisson/.test(n)) return '🐟';
  if (/\boeuf|\boeufs/.test(n)) return '🥚';

  // Légumes
  if (/tomat/.test(n)) return '🍅';
  if (/oignon|échalote/.test(n)) return '🧅';
  if (/\bail\b/.test(n)) return '🧄';
  if (/carotte/.test(n)) return '🥕';
  if (/poivron|piment/.test(n)) return '🫑';
  if (/aubergine/.test(n)) return '🍆';
  if (/courgette/.test(n)) return '🥒';
  if (/brocoli|chou-fleur|chou/.test(n)) return '🥦';
  if (/champignon/.test(n)) return '🍄';
  if (/épinard/.test(n)) return '🥬';
  if (/salade|laitue/.test(n)) return '🥗';
  if (/pomme.de.terre|patate/.test(n)) return '🥔';
  if (/maïs/.test(n)) return '🌽';
  if (/avocat/.test(n)) return '🥑';
  if (/concombre/.test(n)) return '🥒';

  // Fruits
  if (/citron/.test(n)) return '🍋';
  if (/orange/.test(n)) return '🍊';
  if (/pomme/.test(n)) return '🍎';
  if (/banane/.test(n)) return '🍌';
  if (/mangue/.test(n)) return '🥭';
  if (/ananas/.test(n)) return '🍍';
  if (/fraise/.test(n)) return '🍓';

  // Laitiers
  if (/beurre/.test(n)) return '🧈';
  if (/\blait\b/.test(n)) return '🥛';
  if (/fromage|mozzarella|parmesan|cheddar|gruyère/.test(n)) return '🧀';
  if (/crème/.test(n)) return '🍦';
  if (/yaourt/.test(n)) return '🥛';

  // Féculents & céréales
  if (/\briz\b/.test(n)) return '🍚';
  if (/pâte|spaghetti|tagliatelle|nouille/.test(n)) return '🍝';
  if (/pain/.test(n)) return '🍞';
  if (/farine/.test(n)) return '🌾';
  if (/couscous|semoule/.test(n)) return '🫘';
  if (/lentille|pois chiche|haricot/.test(n)) return '🫘';

  // Condiments & épices
  if (/\bsel\b/.test(n)) return '🧂';
  if (/poivre|cumin|curcuma|curry|cannelle|paprika|coriandre|thym|romarin|basilic|persil|colombo/.test(n)) return '🌶️';
  if (/huile/.test(n)) return '🫙';
  if (/sauce|vinaigre/.test(n)) return '🍶';
  if (/sucre/.test(n)) return '🍬';
  if (/miel/.test(n)) return '🍯';
  if (/chocolat/.test(n)) return '🍫';

  // Liquides & bouillons
  if (/\beau\b|eau froide|eau chaude/.test(n)) return '💧';
  if (/bouillon|fond.de/.test(n)) return '🍲';
  if (/vin/.test(n)) return '🍷';

  return '🫙';
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Step {
  order: number;
  description: string;
  duration_minutes?: number | null;
  tip?: string | null;
}

interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
  category?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: { id: string; name: string; image?: string | null } | null;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  timeMinutes: number | null;
  difficulty: string | null;
  calories: number | null;
  servings: number | null;
  cuisineType: string | null;
  category: string | null;
  tags: string[];
  likeCount: number;
  viewCount: number;
  enriched: boolean;
  ingredients: Ingredient[] | null;
  steps: Step[] | null;
  language: string;
  matchScore?: number;
}

interface PantryEntry {
  id: string;
  ingredient: { name: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAvatarColor(name: string) {
  const colors = ['#C2410C', '#7C3AED', '#0F766E', '#B45309', '#1D4ED8', '#BE185D'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins || 1} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RecipePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data: session } = useSession();
  const { toasts, showToast, dismiss } = useToast();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionResult | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(true);
  const [displayServings, setDisplayServings] = useState(1);
  const [pantry, setPantry] = useState<PantryEntry[]>([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRecipe(data);
        setLikeCount(data.likeCount ?? 0);
        setLiked(data.liked ?? false);
        setDisplayServings(data.servings ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/recipes/${id}/nutrition`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setNutrition(data);
        setNutritionLoading(false);
      })
      .catch(() => setNutritionLoading(false));

    fetch(`/api/recipes/${id}/comment`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []));

    // Load pantry for ingredient matching
    fetch('/api/pantry')
      .then((r) => r.json())
      .then((data) => {
        setPantry(data.pantry ?? []);
        setPantryLoaded(true);
      })
      .catch(() => setPantryLoaded(true));
  }, [id]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleLike = async () => {
    if (!session) return;
    const method = liked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/recipes/${id}/like`, { method });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !session) return;
    setSending(true);
    const res = await fetch(`/api/recipes/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment.trim() }),
    });
    if (res.ok) {
      const { comment: c } = await res.json();
      setComments((prev) => [c, ...prev]);
      setComment('');
    }
    setSending(false);
  };

  const deleteComment = async (commentId: string) => {
    const res = await fetch(`/api/recipes/${id}/comment?commentId=${commentId}`, {
      method: 'DELETE',
    });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const toggleStep = (order: number) => {
    setDoneSteps((prev) => {
      const n = new Set(prev);
      n.has(order) ? n.delete(order) : n.add(order);
      return n;
    });
  };

  const shareRecipe = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: recipe?.title ?? 'Recette', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addToJournal = async () => {
    if (!recipe) return;
    const res = await fetch('/api/meal-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id, servings: displayServings }),
    });
    if (res.ok) {
      showToast('Ajouté à votre journal nutritionnel !', 'success');
    } else {
      showToast('Erreur lors de l\'ajout au journal', 'error');
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-canvas-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 mb-4 font-medium">Recette introuvable</p>
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push('/discover');
            }}
            className="text-brand-500 hover:text-brand-600 font-medium text-sm"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps)
    ? recipe.steps.sort((a, b) => a.order - b.order)
    : [];
  const doneCount = doneSteps.size;
  const totalSteps = steps.length;

  const pantryNames = new Set(pantry.map((p) => p.ingredient.name.toLowerCase().trim()));

  const isInPantry = (name: string) => pantryNames.has(name.toLowerCase().trim());

  // Nutrition per-serving computed values
  const perServing = nutrition?.perServing;
  const scaledKcal = perServing ? Math.round(perServing.kcal * displayServings) : null;
  const scaledProteins = perServing
    ? Math.round(perServing.proteins * displayServings * 10) / 10
    : null;
  const scaledCarbs = perServing
    ? Math.round(perServing.carbs * displayServings * 10) / 10
    : null;
  const scaledFats = perServing
    ? Math.round(perServing.fats * displayServings * 10) / 10
    : null;

  const matchScore = recipe.matchScore != null ? Math.round(recipe.matchScore * 100) : null;

  // Macro bar max for visual scaling
  const macroTotal = (scaledProteins ?? 0) + (scaledCarbs ?? 0) + (scaledFats ?? 0);
  const macroBarWidth = (val: number) =>
    macroTotal > 0 ? `${Math.min(100, Math.round((val / macroTotal) * 100))}%` : '0%';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-canvas-50">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Hero Image ── */}
      <div className="relative w-full h-[260px] bg-stone-900 overflow-hidden">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-16 h-16 text-stone-700" />
          </div>
        )}
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-transparent" />

        {/* Top nav */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push('/discover');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 backdrop-blur-md rounded-full text-white text-sm font-medium hover:bg-white/25 transition-colors border border-white/15"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={shareRecipe}
              className="w-9 h-9 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors border border-white/15"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            {session && (
              <button
                onClick={handleLike}
                className="w-9 h-9 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/25 transition-colors border border-white/15"
              >
                <Heart
                  className={`w-4 h-4 transition-all ${
                    liked ? 'fill-rose-400 text-rose-400' : ''
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Bottom badges on hero */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          {/* Cuisine badge bottom-left */}
          {recipe.cuisineType && (
            <span className="px-2.5 py-1 bg-white/80 backdrop-blur-sm text-night text-[11px] font-bold uppercase tracking-wider rounded-full">
              {recipe.cuisineType}
            </span>
          )}
          {/* Match score badge bottom-right */}
          {matchScore !== null && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-olive-500 text-white text-[11px] font-bold rounded-full">
              <Zap className="w-3 h-3" />
              {matchScore}% match frigo
            </span>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="px-4 pt-5 pb-10 max-w-2xl mx-auto space-y-6">

        {/* ── Titre + description ── */}
        <div>
          <h1 className="font-serif text-[28px] font-bold text-night leading-tight">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-stone-500 text-sm mt-2 italic leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {/* ── Métas en ligne ── */}
        <div className="flex flex-wrap gap-3 text-sm text-warm-700">
          {recipe.timeMinutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-500" />
              {recipe.timeMinutes} min
            </span>
          )}
          {recipe.difficulty && (
            <span className="flex items-center gap-1.5">
              🔪 {recipe.difficulty}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-brand-500" />
              {recipe.servings} pers.
            </span>
          )}
          <span className="flex items-center gap-1.5 ml-auto">
            <Heart
              className={`w-4 h-4 ${likeCount > 0 ? 'fill-rose-400 text-rose-400' : 'text-stone-300'}`}
            />
            <span className="text-stone-400">{likeCount}</span>
          </span>
        </div>

        {/* ── Card Apports Nutritionnels ── */}
        {(nutritionLoading || nutrition) && (
          <div className="bg-[#FDF0EA] border border-brand-500/15 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-500">
                Apports Nutritionnels
              </span>
              {nutrition && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-olive-100 text-olive-700 rounded-full uppercase tracking-wide">
                  Équilibré
                </span>
              )}
            </div>

            {nutritionLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 bg-white/60 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : nutrition && (
              <>
                {/* Calories */}
                <div className="flex items-end gap-1.5 mb-3">
                  <span className="font-serif text-5xl font-extrabold text-brand-500 leading-none">
                    {scaledKcal}
                  </span>
                  <span className="text-sm text-stone-400 mb-1">/portion</span>
                </div>

                {/* Servings selector */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setDisplayServings((v) => Math.max(1, v - 1))}
                    className="w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-500 hover:bg-brand-50 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-stone-500 font-medium w-16 text-center">
                    {displayServings} pers.
                  </span>
                  <button
                    onClick={() => setDisplayServings((v) => Math.min(12, v + 1))}
                    className="w-6 h-6 rounded-full border border-brand-200 flex items-center justify-center text-brand-500 hover:bg-brand-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Macro bars */}
                <div className="space-y-2.5">
                  {[
                    { label: 'Protéines', val: scaledProteins ?? 0, unit: 'g', color: 'bg-olive-500' },
                    { label: 'Glucides', val: scaledCarbs ?? 0, unit: 'g', color: 'bg-warm-700' },
                    { label: 'Lipides', val: scaledFats ?? 0, unit: 'g', color: 'bg-honey-500' },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-600 font-medium">{m.label}</span>
                        <span className="text-stone-400">{m.val}{m.unit}</span>
                      </div>
                      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${m.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: macroBarWidth(m.val) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CTA Cuisiner ce plat ── */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-serif text-base font-bold text-white leading-tight">
                Envie de cuisiner ce plat ?
              </p>
              <p className="text-white/70 text-xs mt-0.5 leading-relaxed">
                Suivez vos calories et macros en un clic.
              </p>
              <button
                onClick={addToJournal}
                className="mt-3 bg-white text-brand-500 rounded-xl px-4 py-2 text-xs font-bold shadow hover:-translate-y-0.5 transition-all duration-200"
              >
                + Ajouter à mon journal
              </button>
            </div>
          </div>
        </div>

        {/* ── Section Ingrédients ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-xl font-bold text-night">Ingrédients</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDisplayServings((v) => Math.max(1, v - 1))}
                className="w-7 h-7 rounded-lg border border-canvas-200 flex items-center justify-center text-stone-500 hover:border-brand-300 hover:text-brand-500 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm text-stone-600 font-medium w-14 text-center">
                {displayServings} pers.
              </span>
              <button
                onClick={() => setDisplayServings((v) => Math.min(12, v + 1))}
                className="w-7 h-7 rounded-lg border border-canvas-200 flex items-center justify-center text-stone-500 hover:border-brand-300 hover:text-brand-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-stone-400 mb-3">Vérifiez vos placards avant de commencer</p>

          {ingredients.length === 0 ? (
            <p className="text-stone-400 text-sm">Aucun ingrédient listé.</p>
          ) : (
            <>
              <div className="space-y-2">
                {ingredients.map((ing, i) => {
                  const inFridge = pantryLoaded && isInPantry(ing.name);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-canvas-100 border border-canvas-200 rounded-xl px-3 py-2.5"
                    >
                      <span className="text-base">
                        {getIngredientEmoji(ing.name, ing.category)}
                      </span>
                      <span className="flex-1 text-sm font-medium text-night capitalize">
                        {ing.name}
                      </span>
                      {(ing.quantity || ing.unit) && (
                        <span className="text-xs text-stone-400">
                          {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                        </span>
                      )}
                      {pantryLoaded && (
                        <span
                          className={`text-[10px] font-semibold rounded-lg px-2 py-0.5 flex-shrink-0 ${
                            inFridge
                              ? 'bg-olive-100 text-olive-700'
                              : 'bg-brand-500/10 text-brand-600'
                          }`}
                        >
                          {inFridge ? 'DANS LE FRIGO' : 'MANQUANT'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={async () => {
                  const res = await fetch('/api/shopping-list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipeId: recipe.id,
                      recipeTitle: recipe.title,
                      recipeImageUrl: recipe.imageUrl ?? null,
                      ingredients: ingredients.map((i) => ({
                        name: i.name,
                        quantity: [i.quantity, i.unit].filter(Boolean).join(' '),
                      })),
                    }),
                  });
                  if (res.ok) showToast('Recette ajoutée à la liste de courses !', 'success');
                  else showToast('Erreur lors de l\'ajout aux courses', 'error');
                }}
                className="mt-3 flex items-center gap-2 text-sm text-stone-400 hover:text-brand-500 transition-colors font-medium"
              >
                <ShoppingCart className="w-4 h-4" /> Tout ajouter aux courses
              </button>
            </>
          )}
        </div>

        {/* ── Section Préparation ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-night">Préparation</h2>
            {totalSteps > 0 && (
              <span className="text-sm text-stone-400">
                <span className="text-brand-500 font-semibold">{doneCount}</span>/{totalSteps}{' '}
                étapes
              </span>
            )}
          </div>

          {/* Barre progression */}
          {totalSteps > 0 && (
            <div className="h-1 bg-canvas-200 rounded-full mb-5 overflow-hidden">
              <motion.div
                className="h-full bg-brand-500 rounded-full"
                animate={{ width: `${(doneCount / totalSteps) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}

          {steps.length === 0 ? (
            <p className="text-stone-400 text-sm">Aucune étape disponible.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((step) => {
                const done = doneSteps.has(step.order);
                return (
                  <li
                    key={step.order}
                    onClick={() => toggleStep(step.order)}
                    className={`flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                      done
                        ? 'bg-olive-100/60 border-olive-200 opacity-60'
                        : 'bg-canvas-100 border-canvas-200 hover:border-brand-200 hover:shadow-card shadow-card'
                    }`}
                  >
                    {/* Step number circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all ${
                        done ? 'bg-brand-500 text-white' : 'bg-canvas-200 text-warm-700'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : step.order}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[15px] leading-relaxed font-sans ${
                          done ? 'line-through text-stone-400' : 'text-warm-700 font-medium'
                        }`}
                      >
                        {step.description}
                      </p>
                      {step.duration_minutes && !done && (
                        <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {step.duration_minutes} min
                        </p>
                      )}
                      {step.tip && !done && (
                        <div className="mt-2.5 flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                          <span className="flex-shrink-0">💡</span>
                          <span>{step.tip}</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 py-4 border-t border-canvas-200">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-canvas-100 text-stone-400 rounded-full text-xs font-medium border border-canvas-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <StoresNearby />

        {/* ── Commentaires ── */}
        <div className="pt-6 border-t border-canvas-200">
          <h2 className="font-serif text-xl font-bold text-night mb-5">
            Commentaires{' '}
            {comments.length > 0 && (
              <span className="text-stone-400 font-normal text-base">({comments.length})</span>
            )}
          </h2>

          {session ? (
            <div className="flex gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                style={{ background: getAvatarColor(session.user.name ?? 'U') }}
              >
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Partagez votre expérience..."
                  className="input-base flex-1"
                />
                <button
                  onClick={handleComment}
                  disabled={!comment.trim() || sending}
                  className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-xl px-4 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-stone-500 text-sm mb-5">
              <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium">
                Connectez-vous
              </Link>{' '}
              pour commenter.
            </p>
          )}

          {comments.length === 0 ? (
            <p className="text-stone-400 text-sm">Soyez le premier à commenter !</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                    style={{ background: getAvatarColor(c.user?.name ?? 'U') }}
                  >
                    {c.user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-canvas-100 rounded-2xl p-4 border border-canvas-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-night">
                        {c.user?.name ?? 'Anonyme'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{timeAgo(c.createdAt)}</span>
                        {session?.user.id === c.userId && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="text-stone-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
