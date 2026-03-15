'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Globe, ArrowRight, LogOut, Loader2,
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';

// ─── Constantes ────────────────────────────────────────────────────────────

const GOALS: Record<string, string> = {
  lose: 'Manger sain',
  sport: 'Objectif sport',
  cook: 'Cuisiner & partager',
};

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [goalLabel, setGoalLabel] = useState('');
  const [pantryCount, setPantryCount] = useState(0);
  const [shoppingCount, setShoppingCount] = useState(0);

  const userName = session?.user.name ?? 'Chef';

  const loadProfileData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Load profile goal
      const profileRes = await fetch(`/api/users/${session.user.id}`);
      if (profileRes.ok) {
        const { user } = await profileRes.json();
        if (user?.profile?.goal) {
          setGoalLabel(GOALS[user.profile.goal] ?? '');
        }
      }

      // Load pantry count
      const pantryRes = await fetch('/api/pantry');
      if (pantryRes.ok) {
        const { pantry } = await pantryRes.json();
        setPantryCount(pantry.length);
      }

      // Load shopping list count
      const shoppingRes = await fetch('/api/shopping-list');
      if (shoppingRes.ok) {
        const { lists } = await shoppingRes.json();
        if (lists.length > 0) {
          const items = lists[0].items ?? [];
          setShoppingCount(items.filter((i: { checked: boolean }) => !i.checked).length);
        }
      }
    } catch {
      // Silently handle
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="max-w-md mx-auto">
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
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Ingrédients', value: pantryCount },
            { label: 'Courses', value: shoppingCount },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 text-center border border-canvas-200 shadow-card">
              <p className="font-serif text-3xl font-bold text-stone-900">{s.value}</p>
              <p className="text-xs text-stone-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden">
          <Link href="/feed" className="flex items-center justify-between px-5 py-4 hover:bg-canvas-50 transition-colors border-b border-canvas-100">
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
      </div>
    </motion.div>
  );
}
