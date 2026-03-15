'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, Loader2, ChefHat, Globe,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';

// ─── Constantes ────────────────────────────────────────────────────────────

const GOALS = [
  {
    id: 'lose', label: 'Manger sain', desc: 'Recettes légères et équilibrées',
    image: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    color: '#065F46',
  },
  {
    id: 'sport', label: 'Objectif sport', desc: 'High-protein, haute énergie',
    image: 'https://www.themealdb.com/images/media/meals/ysxwuq1487323065.jpg',
    color: '#92400E',
  },
  {
    id: 'cook', label: 'Cuisiner & partager', desc: 'Explorer, créer, régaler',
    image: 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg',
    color: '#1E1B4B',
  },
];

// ─── Composant principal ────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [view, setView] = useState<'landing' | 'goal'>('landing');
  const [savingGoal, setSavingGoal] = useState(false);

  // ── Check auth + profile ──────────────────────────────────────────────────

  const checkProfile = useCallback(async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`);
    if (res.ok) {
      const { user } = await res.json();
      if (user.profile?.goal) {
        // User has a goal set -- redirect to fridge
        router.replace('/fridge');
        return;
      }
    }
    // No goal yet -- show goal selection
    setView('goal');
  }, [router]);

  useEffect(() => {
    if (isPending) return;
    if (!session) { setView('landing'); return; }
    checkProfile(session.user.id);
  }, [session, isPending, checkProfile]);

  // ── Goal selection handler ────────────────────────────────────────────────

  const handleSelectGoal = async (selectedGoal: string) => {
    if (!session) return;
    setSavingGoal(true);
    await fetch(`/api/users/${session.user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: selectedGoal, isPublic: true }),
    });
    setSavingGoal(false);
    router.replace('/fridge');
  };

  // ── Loading ─────────────────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
      </div>
    );
  }

  // ── Landing (unauthenticated) ───────────────────────────────────────────

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-stone-950 overflow-hidden">
        {/* Fond texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          {/* Nav */}
          <div className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-white text-lg">Cuisine<span className="text-brand-200 font-bold">Connect</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-stone-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
                Se connecter
              </Link>
              <Link href="/register" className="btn-primary">
                Commencer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-stone-300 text-xs font-medium mb-8 border border-white/10">
                <Globe className="w-3.5 h-3.5" />
                598 recettes -- 27 cuisines du monde
              </div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05]">
                Cuisinez avec<br />
                <span className="text-brand-200">ce que vous avez.</span>
              </h1>
              <p className="text-stone-400 text-xl leading-relaxed mb-10 max-w-lg">
                Votre compagnon culinaire intelligent — gérez votre frigo, découvrez des recettes personnalisées, partagez vos créations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register" className="btn-primary text-base px-8 py-4">
                  Créer un compte gratuit <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/feed" className="btn-secondary text-base px-8 py-4 bg-white/10 border-white/10 text-white hover:bg-white/20">
                  Explorer les recettes
                </Link>
              </div>
            </motion.div>

            {/* Grille photos éditoriale */}
            <motion.div
              className="hidden lg:grid grid-cols-2 gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {[
                { src: 'https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg', title: 'Jerk Chicken', cuisine: 'Jamaïcaine', tall: true },
                { src: 'https://www.themealdb.com/images/media/meals/ysxwuq1487323065.jpg', title: 'Beef Wellington', cuisine: 'Britannique', tall: false },
                { src: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg', title: 'Shakshuka', cuisine: 'Moyen-Orient', tall: false },
                { src: 'https://www.themealdb.com/images/media/meals/1529442352.jpg', title: 'Sushi', cuisine: 'Japonaise', tall: false },
              ].map((item, i) => (
                <div key={i} className={`relative rounded-2xl overflow-hidden group ${i === 0 ? 'row-span-2' : ''}`}>
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-500"
                    style={{ minHeight: i === 0 ? '320px' : '150px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <p className="text-white font-serif font-semibold text-sm leading-tight">{item.title}</p>
                    <p className="text-white/60 text-[11px]">{item.cuisine}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ── Goal selection (new authenticated user) ──────────────────────────────

  return (
    <div className="min-h-screen bg-canvas-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-3">Bienvenue !</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 mb-3">
            {session?.user.name ? `Bonjour, ${session.user.name.split(' ')[0]} !` : 'Bienvenue !'}
          </h2>
          <p className="text-stone-500 text-lg">Quelle cuisine vous inspire le plus ?</p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5">
          {GOALS.map((g, i) => (
            <motion.button
              key={g.id}
              onClick={() => !savingGoal && handleSelectGoal(g.id)}
              disabled={savingGoal}
              className="relative rounded-3xl overflow-hidden aspect-[3/4] group text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
            >
              <img
                src={g.image}
                alt={g.label}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                {savingGoal ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin mb-3" />
                ) : null}
                <h3 className="font-serif text-2xl font-bold text-white mb-1.5">{g.label}</h3>
                <p className="text-stone-300 text-sm">{g.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
