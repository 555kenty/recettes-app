'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Clock, Flame, Users, Send, Trash2, ChefHat, CheckCircle2, ShoppingCart, Share2, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { StoresNearby } from '@/app/components/StoresNearby';

interface Step { order: number; description: string; duration_minutes?: number | null; tip?: string | null }
interface Ingredient { name: string; quantity?: string; unit?: string; category?: string }
interface Comment { id: string; content: string; createdAt: string; userId: string; user: { id: string; name: string; image?: string | null } | null }

interface Recipe {
  id: string; title: string; description: string | null; imageUrl: string | null;
  timeMinutes: number | null; difficulty: string | null; calories: number | null;
  servings: number | null; cuisineType: string | null; category: string | null;
  tags: string[]; likeCount: number; viewCount: number; enriched: boolean;
  ingredients: Ingredient[] | null; steps: Step[] | null; language: string;
}

function getAvatarColor(name: string) {
  const colors = ['#C2410C','#7C3AED','#0F766E','#B45309','#1D4ED8','#BE185D'];
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

export default function RecipePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data: session } = useSession();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => { setRecipe(data); setLikeCount(data.likeCount ?? 0); setLiked(data.liked ?? false); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/recipes/${id}/comment`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []));
  }, [id]);

  const handleLike = async () => {
    if (!session) return;
    const method = liked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/recipes/${id}/like`, { method });
    if (res.ok) { const data = await res.json(); setLiked(!liked); setLikeCount(data.likeCount); }
  };

  const handleComment = async () => {
    if (!comment.trim() || !session) return;
    setSending(true);
    const res = await fetch(`/api/recipes/${id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment.trim() }),
    });
    if (res.ok) { const { comment: c } = await res.json(); setComments((prev) => [c, ...prev]); setComment(''); }
    setSending(false);
  };

  const deleteComment = async (commentId: string) => {
    const res = await fetch(`/api/recipes/${id}/comment?commentId=${commentId}`, { method: 'DELETE' });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const toggleStep = (order: number) => {
    setDoneSteps((prev) => { const n = new Set(prev); n.has(order) ? n.delete(order) : n.add(order); return n; });
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
          <button onClick={() => { if (window.history.length > 1) router.back(); else router.push('/discover'); }} className="text-brand-500 hover:text-brand-600 font-medium text-sm">← Retour</button>
        </div>
      </div>
    );
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps.sort((a, b) => a.order - b.order) : [];
  const doneCount = doneSteps.size;
  const totalSteps = steps.length;

  return (
    <div className="min-h-screen bg-canvas-50">
      {/* ── Hero ── */}
      <div className="relative h-[55vh] min-h-[320px] bg-stone-900">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover opacity-75" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-stone-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />

        {/* Actions */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else router.push('/discover'); }}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={shareRecipe}
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            {session && (
              <button
                onClick={handleLike}
                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10"
              >
                <Heart className={`w-4 h-4 transition-all ${liked ? 'fill-rose-400 text-rose-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-20 left-5 flex flex-wrap gap-2">
          {recipe.enriched && (
            <span className="px-2.5 py-1 bg-violet-600/80 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full tracking-wider border border-violet-500/30">
              ✦ Enrichi IA
            </span>
          )}
          {recipe.cuisineType && (
            <span className="px-2.5 py-1 bg-stone-900/60 backdrop-blur-sm text-white text-[11px] font-medium rounded-full border border-white/10">
              {recipe.cuisineType}
            </span>
          )}
          {recipe.difficulty && (
            <span className="px-2.5 py-1 bg-stone-900/60 backdrop-blur-sm text-white text-[11px] font-medium rounded-full border border-white/10">
              {recipe.difficulty}
            </span>
          )}
        </div>

        {/* Titre */}
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
          {recipe.category && (
            <p className="text-[11px] font-semibold text-brand-200 uppercase tracking-wider mb-2">{recipe.category}</p>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl">
            {recipe.title}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Méta ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {recipe.timeMinutes && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm text-stone-700 border border-canvas-200 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-brand-500" />{recipe.timeMinutes} min
            </span>
          )}
          {recipe.calories && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm text-stone-700 border border-canvas-200 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-orange-500" />{recipe.calories} kcal
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm text-stone-700 border border-canvas-200 shadow-sm">
              <Users className="w-3.5 h-3.5 text-blue-500" />{recipe.servings} pers.
            </span>
          )}
          <span className="flex items-center gap-1 text-sm text-stone-400 ml-auto">
            <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            {likeCount}
          </span>
        </div>

        {recipe.description && (
          <p className="text-stone-600 text-lg leading-relaxed mb-10 max-w-3xl">{recipe.description}</p>
        )}

        {/* ── Contenu principal ── */}
        <div className="grid lg:grid-cols-3 gap-8 mb-10">

          {/* Ingrédients */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <h2 className="font-serif text-xl font-bold text-stone-900 mb-4">Ingrédients</h2>
              {ingredients.length === 0 ? (
                <p className="text-stone-400 text-sm">Aucun ingrédient listé.</p>
              ) : (
                <>
                  <ul className="space-y-2.5 mb-5">
                    {ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-3 text-stone-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
                        <span className="text-sm leading-snug">
                          <span className="font-medium">{ing.name}</span>
                          {(ing.quantity || ing.unit) && (
                            <span className="text-stone-400 ml-1">— {[ing.quantity, ing.unit].filter(Boolean).join(' ')}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      // Ajouter tous les ingrédients à la liste de courses
                      const body = JSON.stringify({
                        name: 'Ma liste',
                        items: ingredients.map(i => ({ name: `${i.name}${i.quantity ? ` — ${i.quantity}` : ''}`, checked: false })),
                      });
                      fetch('/api/shopping-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
                    }}
                    className="flex items-center gap-2 text-sm text-stone-500 hover:text-brand-500 transition-colors font-medium"
                  >
                    <ShoppingCart className="w-4 h-4" /> Tout ajouter aux courses
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Étapes */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-stone-900">Préparation</h2>
              {totalSteps > 0 && (
                <span className="text-sm text-stone-400">
                  <span className="text-brand-500 font-semibold">{doneCount}</span>/{totalSteps} étapes
                </span>
              )}
            </div>

            {/* Barre progression */}
            {totalSteps > 0 && (
              <div className="h-1 bg-canvas-200 rounded-full mb-6 overflow-hidden">
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
                      className={`flex gap-4 p-5 rounded-2xl border cursor-pointer transition-all select-none ${
                        done ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-canvas-200 hover:border-brand-200 hover:shadow-card shadow-card'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all ${
                        done ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white'
                      }`}>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : step.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-stone-700 leading-relaxed text-[15px] ${done ? 'line-through text-stone-400' : ''}`}>
                          {step.description}
                        </p>
                        {step.duration_minutes && !done && (
                          <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {step.duration_minutes} min
                          </p>
                        )}
                        {step.tip && !done && (
                          <div className="mt-3 flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
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
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 py-6 border-t border-canvas-200">
            {recipe.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-canvas-100 text-stone-500 rounded-full text-xs font-medium">#{tag}</span>
            ))}
          </div>
        )}

        <StoresNearby />

        {/* ── Commentaires ── */}
        <div className="mt-10 pt-8 border-t border-canvas-200">
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-6">
            Commentaires {comments.length > 0 && <span className="text-stone-400 font-normal text-base">({comments.length})</span>}
          </h2>

          {session ? (
            <div className="flex gap-3 mb-6">
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
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-stone-500 text-sm mb-6">
              <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium">Connectez-vous</Link> pour commenter.
            </p>
          )}

          {comments.length === 0 ? (
            <p className="text-stone-400 text-sm">Soyez le premier à commenter !</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                    style={{ background: getAvatarColor(c.user?.name ?? 'U') }}
                  >
                    {c.user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-white rounded-2xl p-4 border border-canvas-200 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-stone-900">{c.user?.name ?? 'Anonyme'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{timeAgo(c.createdAt)}</span>
                        {session?.user.id === c.userId && (
                          <button onClick={() => deleteComment(c.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-stone-700 text-sm leading-relaxed">{c.content}</p>
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
