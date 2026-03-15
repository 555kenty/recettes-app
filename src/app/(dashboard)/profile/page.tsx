'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Globe, ArrowRight, LogOut, Loader2, Heart, Clock, ChefHat,
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';

// ─── Constantes ────────────────────────────────────────────────────────────

const GOALS: Record<string, string> = {
  lose: 'Manger sain',
  sport: 'Objectif sport',
  cook: 'Cuisiner & partager',
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface LikedRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  timeMinutes: number | null;
  difficulty: string | null;
  cuisineType: string | null;
  likeCount: number;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [goalLabel, setGoalLabel] = useState('');
  const [pantryCount, setPantryCount] = useState(0);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [likedRecipes, setLikedRecipes] = useState<LikedRecipe[]>([]);
  const [likedLoading, setLikedLoading] = useState(true);

  const userName = session?.user.name ?? 'Chef';

  const loadProfileData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [profileRes, pantryRes, shoppingRes] = await Promise.all([
        fetch(`/api/users/${session.user.id}`),
        fetch('/api/pantry'),
        fetch('/api/shopping-list'),
      ]);

      if (profileRes.ok) {
        const { user } = await profileRes.json();
        if (user?.profile?.goal) setGoalLabel(GOALS[user.profile.goal] ?? '');
      }
      if (pantryRes.ok) {
        const { pantry } = await pantryRes.json();
        setPantryCount(pantry.length);
      }
      if (shoppingRes.ok) {
        const { lists } = await shoppingRes.json();
        if (lists.length > 0) {
          const items = lists[0].items ?? [];
          setShoppingCount(items.filter((i: { checked: boolean }) => !i.checked).length);
        }
      }
    } catch {}
    setLoading(false);
  }, [session]);

  const loadLikedRecipes = useCallback(async () => {
    if (!session) return;
    setLikedLoading(true);
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const { favorites } = await res.json();
        setLikedRecipes(favorites);
      }
    } catch {}
    setLikedLoading(false);
  }, [session]);

  useEffect(() => {
    loadProfileData();
    loadLikedRecipes();
  }, [loadProfileData, loadLikedRecipes]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="max-w-2xl mx-auto">
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
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Ingrédients', value: pantryCount },
            { label: 'Courses', value: shoppingCount },
            { label: 'Likes', value: likedRecipes.length },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 text-center border border-canvas-200 shadow-card">
              <p className="font-serif text-3xl font-bold text-stone-900">{s.value}</p>
              <p className="text-xs text-stone-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden mb-8">
          <Link href="/discover" className="flex items-center justify-between px-5 py-4 hover:bg-canvas-50 transition-colors border-b border-canvas-100">
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
            onClick={() => signOut().then(() => router.replace('/login'))}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Se déconnecter</span>
          </button>
        </div>

        {/* Mes Likes */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 fill-rose-400 text-rose-400" /> Mes recettes likées
          </h2>

          {likedLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            </div>
          ) : likedRecipes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-canvas-200 shadow-card p-8 text-center">
              <Heart className="w-8 h-8 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-500 text-sm">Vous n'avez encore liké aucune recette.</p>
              <Link href="/discover" className="inline-block mt-3 text-brand-500 hover:text-brand-600 text-sm font-medium">
                Découvrir des recettes →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {likedRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-canvas-200 shadow-card hover:shadow-lg hover:border-brand-200 transition-all"
                >
                  <div className="aspect-[4/3] relative bg-stone-100">
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-8 h-8 text-stone-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                      <span className="text-[10px] font-semibold text-stone-700">{recipe.likeCount}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    {recipe.cuisineType && (
                      <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider mb-1">{recipe.cuisineType}</p>
                    )}
                    <p className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">{recipe.title}</p>
                    {recipe.timeMinutes && (
                      <p className="flex items-center gap-1 text-xs text-stone-400 mt-1.5">
                        <Clock className="w-3 h-3" />{recipe.timeMinutes} min
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
