'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Clock, Flame, Users, Send, Trash2, ChefHat, CheckCircle2 } from 'lucide-react';
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

export default function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRecipe(data);
        setLikeCount(data.likeCount ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/recipes/${id}/comment`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []));
  }, [id]);

  const handleLike = async () => {
    if (!session) return;
    const method = liked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/recipes/${id}/like`, { method });
    if (res.ok) {
      const data = await res.json();
      setLiked(!liked);
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
      const { comment: newComment } = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setComment('');
    }
    setSending(false);
  };

  const deleteComment = async (commentId: string) => {
    const res = await fetch(`/api/recipes/${id}/comment?commentId=${commentId}`, { method: 'DELETE' });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const toggleStep = (order: number) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      next.has(order) ? next.delete(order) : next.add(order);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Chargement...</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Recette introuvable</p>
          <button onClick={() => router.back()} className="text-rose-500 hover:underline">Retour</button>
        </div>
      </div>
    );
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps.sort((a, b) => a.order - b.order) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 lg:h-96 bg-slate-800">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-20 h-20 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Bouton like */}
        {session && (
          <button
            onClick={handleLike}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <Heart className={`w-5 h-5 transition-colors ${liked ? 'fill-rose-400 text-rose-400' : ''}`} />
          </button>
        )}

        {/* Titre */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {recipe.enriched && (
            <span className="inline-block px-2 py-0.5 bg-rose-500 text-white text-xs rounded-full mb-2">✨ Enrichi par IA</span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{recipe.title}</h1>
          {recipe.cuisineType && <p className="text-white/70 text-sm mt-1">Cuisine {recipe.cuisineType}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Méta */}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-slate-200">
          {recipe.timeMinutes && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-rose-500" />
              <span className="font-medium">{recipe.timeMinutes} min</span>
            </div>
          )}
          {recipe.calories && (
            <div className="flex items-center gap-2 text-slate-600">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{recipe.calories} kcal</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{recipe.servings} personnes</span>
            </div>
          )}
          {recipe.difficulty && (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{recipe.difficulty}</span>
          )}
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
            {likeCount}
          </div>
        </div>

        {recipe.description && (
          <p className="text-slate-600 text-lg leading-relaxed mb-8">{recipe.description}</p>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Ingrédients */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Ingrédients</h2>
            {ingredients.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucun ingrédient listé</p>
            ) : (
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                    <span>
                      <span className="font-medium">{ing.name}</span>
                      {(ing.quantity || ing.unit) && (
                        <span className="text-slate-400 ml-1">— {[ing.quantity, ing.unit].filter(Boolean).join(' ')}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Étapes */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Préparation</h2>
            {steps.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune étape disponible</p>
            ) : (
              <ol className="space-y-4">
                {steps.map((step) => (
                  <li
                    key={step.order}
                    onClick={() => toggleStep(step.order)}
                    className={`flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                      doneSteps.has(step.order)
                        ? 'bg-emerald-50 border-emerald-200 opacity-70'
                        : 'bg-white border-slate-100 hover:border-rose-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-colors ${
                      doneSteps.has(step.order) ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {doneSteps.has(step.order) ? <CheckCircle2 className="w-4 h-4" /> : step.order}
                    </div>
                    <div className="flex-1">
                      <p className={`text-slate-700 leading-relaxed ${doneSteps.has(step.order) ? 'line-through text-slate-400' : ''}`}>
                        {step.description}
                      </p>
                      {step.duration_minutes && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {step.duration_minutes} min
                        </p>
                      )}
                      {step.tip && (
                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg mt-2">
                          💡 {step.tip}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-200">
            {recipe.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">#{tag}</span>
            ))}
          </div>
        )}

        {/* Trouver en magasin */}
        <StoresNearby />

        {/* Commentaires */}
        <div className="mt-10 pt-8 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Commentaires ({comments.length})</h2>

          {session ? (
            <div className="flex gap-3 mb-6">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Laissez un commentaire..."
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-400"
                />
                <button
                  onClick={handleComment}
                  disabled={!comment.trim() || sending}
                  className="px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-6">
              <a href="/login" className="text-rose-500 hover:underline">Connectez-vous</a> pour commenter
            </p>
          )}

          {comments.length === 0 ? (
            <p className="text-slate-400 text-sm">Soyez le premier à commenter !</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600 font-bold text-xs">
                    {c.user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-slate-800">{c.user?.name ?? 'Anonyme'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        {session?.user.id === c.userId && (
                          <button onClick={() => deleteComment(c.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700 text-sm">{c.content}</p>
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
