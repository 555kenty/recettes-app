'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Globe, ArrowRight, LogOut, Loader2, Heart, Clock, ChefHat,
  Save, CheckCircle2, Pencil, Trash2, Lock, Unlock,
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';

// ─── Constantes ────────────────────────────────────────────────────────────

const GOALS: Record<string, string> = {
  lose: 'Manger sain',
  sport: 'Objectif sport',
  cook: 'Cuisiner & partager',
};

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sédentaire' },
  { value: 'light', label: 'Légèrement actif' },
  { value: 'moderate', label: 'Modérément actif' },
  { value: 'active', label: 'Très actif' },
  { value: 'very_active', label: 'Extrêmement actif' },
];

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProfileForm {
  age: string;
  weight: string;
  height: string;
  gender: string;
  activityLevel: string;
}

interface LikedRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  timeMinutes: number | null;
  difficulty: string | null;
  cuisineType: string | null;
  likeCount: number;
}

interface MyRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  timeMinutes: number | null;
  difficulty: string | null;
  cuisineType: string | null;
  isPublic: boolean;
  createdAt: string;
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
  const [myRecipes, setMyRecipes] = useState<MyRecipe[]>([]);
  const [myRecipesLoading, setMyRecipesLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    age: '', weight: '', height: '', gender: '', activityLevel: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
        if (user?.profile) {
          setProfileForm({
            age: user.profile.age?.toString() ?? '',
            weight: user.profile.weight?.toString() ?? '',
            height: user.profile.height?.toString() ?? '',
            gender: user.profile.gender ?? '',
            activityLevel: user.profile.activityLevel ?? '',
          });
        }
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

  const saveProfile = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: profileForm.age ? parseInt(profileForm.age) : null,
          weight: profileForm.weight ? parseFloat(profileForm.weight) : null,
          height: profileForm.height ? parseFloat(profileForm.height) : null,
          gender: profileForm.gender || null,
          activityLevel: profileForm.activityLevel || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

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

  const loadMyRecipes = useCallback(async () => {
    if (!session) return;
    setMyRecipesLoading(true);
    try {
      const res = await fetch('/api/recipes?mine=true');
      if (res.ok) {
        const { recipes } = await res.json();
        setMyRecipes(recipes);
      }
    } catch {}
    setMyRecipesLoading(false);
  }, [session]);

  const deleteRecipe = async (id: string) => {
    if (!confirm('Supprimer cette recette définitivement ?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (res.ok) setMyRecipes((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadProfileData();
    loadLikedRecipes();
    loadMyRecipes();
  }, [loadProfileData, loadLikedRecipes, loadMyRecipes]);

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
            { label: 'Recettes', value: myRecipes.length },
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

        {/* Profil physique */}
        <div className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5 mb-5">
          <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">Mon profil physique</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Âge</label>
              <input
                type="number" min="10" max="100"
                value={profileForm.age}
                onChange={(e) => setProfileForm((p) => ({ ...p, age: e.target.value }))}
                placeholder="ans"
                className="input-base w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Poids (kg)</label>
              <input
                type="number" min="30" max="300" step="0.1"
                value={profileForm.weight}
                onChange={(e) => setProfileForm((p) => ({ ...p, weight: e.target.value }))}
                placeholder="kg"
                className="input-base w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Taille (cm)</label>
              <input
                type="number" min="100" max="250"
                value={profileForm.height}
                onChange={(e) => setProfileForm((p) => ({ ...p, height: e.target.value }))}
                placeholder="cm"
                className="input-base w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Genre</label>
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}
                className="input-base w-full text-sm"
              >
                <option value="">—</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label className="block text-xs font-medium text-stone-500 mb-1.5">Niveau d&apos;activité</label>
              <select
                value={profileForm.activityLevel}
                onChange={(e) => setProfileForm((p) => ({ ...p, activityLevel: e.target.value }))}
                className="input-base w-full text-sm"
              >
                <option value="">—</option>
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Sauvegardé !' : 'Sauvegarder'}
          </button>
        </div>

        {/* Mes recettes créées */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-brand-500" /> Mes recettes
          </h2>

          {myRecipesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            </div>
          ) : myRecipes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-canvas-200 shadow-card p-8 text-center">
              <ChefHat className="w-8 h-8 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-500 text-sm">Vous n'avez encore créé aucune recette.</p>
              <Link href="/recipes/new" className="inline-block mt-3 text-brand-500 hover:text-brand-600 text-sm font-medium">
                Créer une recette →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myRecipes.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-2xl border border-canvas-200 shadow-card flex items-center gap-4 p-3 hover:border-brand-200 transition-all">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-6 h-6 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 text-sm leading-snug line-clamp-1">{recipe.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {recipe.cuisineType && <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider">{recipe.cuisineType}</span>}
                      {recipe.timeMinutes && (
                        <span className="flex items-center gap-0.5 text-xs text-stone-400">
                          <Clock className="w-3 h-3" />{recipe.timeMinutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-xs text-stone-400">
                        {recipe.isPublic ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {recipe.isPublic ? 'Publique' : 'Privée'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="w-8 h-8 rounded-lg bg-brand-50 hover:bg-brand-100 flex items-center justify-center transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5 text-brand-600" />
                    </Link>
                    <button
                      onClick={() => deleteRecipe(recipe.id)}
                      disabled={deletingId === recipe.id}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                      title="Supprimer"
                    >
                      {deletingId === recipe.id
                        ? <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
