'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight, Loader2, ChefHat, Refrigerator, Globe, BarChart3, Sparkles,
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

const STATS = [
  { value: '600+', label: 'Recettes' },
  { value: '4',    label: 'Datasets' },
  { value: '0.7s', label: 'AI Search' },
  { value: '24/7', label: 'Updates' },
];

const PROCESS_STEPS = [
  {
    icon: Refrigerator,
    title: 'Mon Frigo',
    desc: 'Ajoutez vos ingrédients disponibles en quelques secondes.',
    bg: 'bg-brand-100',
    iconColor: 'text-brand-500',
  },
  {
    icon: Globe,
    title: 'Cuisine du Monde',
    desc: 'Recettes personnalisées depuis 27 cuisines internationales.',
    bg: 'bg-olive-100',
    iconColor: 'text-olive-500',
  },
  {
    icon: BarChart3,
    title: 'Macros en temps réel',
    desc: 'Calories, protéines, lipides calculés automatiquement.',
    bg: 'bg-honey-100',
    iconColor: 'text-honey-500',
  },
];

// ─── Animation variants ─────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

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
        router.replace('/fridge');
        return;
      }
    }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1C1410' }}>
        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
      </div>
    );
  }

  // ── Landing (unauthenticated) ───────────────────────────────────────────

  if (view === 'landing') {
    return (
      <div className="min-h-screen font-sans" style={{ background: '#FDF6EE' }}>

        {/* ── Navbar ── */}
        <nav style={{ background: '#1C1410' }} className="sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <ChefHat className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <span className="font-serif font-bold text-white text-lg tracking-tight">
                Cuisine<span className="text-brand-200">Connect</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors px-3 py-2">
                Se connecter
              </Link>
              <Link href="/register" className="btn-primary text-sm px-5 py-2.5">
                Commencer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ background: '#1C1410' }} className="relative overflow-hidden pb-16 pt-12">
          {/* Micro-texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-5">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 mb-8"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(92,122,58,0.25)', color: '#D5E8C4', border: '1px solid rgba(92,122,58,0.4)' }}>
                <span className="w-2 h-2 rounded-full bg-olive-200 animate-pulse" />
                87% match — Trouvé avec les ingrédients du frigo
              </span>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial="hidden" animate="visible" variants={stagger}>
                <motion.h1
                  variants={fadeUp}
                  className="font-serif font-bold text-white mb-5 leading-[1.1]"
                  style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}
                >
                  Cuisinez sainement,<br />
                  <span style={{ color: '#FFC5A8' }}>sans compromis</span><br />
                  sur le goût.
                </motion.h1>

                <motion.p variants={fadeUp} className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Dites-nous ce qu&apos;il y a dans votre frigo. On vous propose des recettes du monde entier, avec les macros calculés en temps réel.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
                  <Link href="/register" className="btn-primary px-7 py-3.5 text-sm">
                    <Refrigerator className="w-4 h-4" />
                    Ouvrir mon frigo
                  </Link>
                  <Link href="/discover" className="btn-secondary px-7 py-3.5 text-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', background: 'transparent' }}>
                    Explorer les recettes
                  </Link>
                </motion.div>
              </motion.div>

              {/* Grille photos */}
              <motion.div
                className="hidden lg:grid grid-cols-2 gap-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.6 }}
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
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      style={{ minHeight: i === 0 ? '280px' : '130px' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <p className="text-white font-serif font-semibold text-sm leading-tight">{item.title}</p>
                      <p className="text-white/55 text-[11px]">{item.cuisine}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="bg-canvas-50 py-12 border-b border-canvas-200">
          <div className="max-w-6xl mx-auto px-5">
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {STATS.map((s) => (
                <motion.div key={s.label} variants={fadeUp} className="text-center">
                  <p className="font-serif font-bold text-brand-500 mb-1" style={{ fontSize: 28 }}>{s.value}</p>
                  <p className="text-warm-700/60 text-[11px] font-semibold uppercase tracking-widest">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Comment ça marche ── */}
        <section className="py-16 bg-canvas-50">
          <div className="max-w-6xl mx-auto px-5">
            <motion.div
              className="text-center mb-10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-warm-700/40 mb-2">
                THE PROCESS
              </motion.p>
              <motion.h2 variants={fadeUp} className="font-serif font-bold text-night" style={{ fontSize: 28 }}>
                Comment ça marche ?
              </motion.h2>
            </motion.div>

            <motion.div
              className="grid sm:grid-cols-3 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {PROCESS_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="card p-6 flex flex-col gap-4"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${step.bg}`}>
                      <Icon className={`w-5 h-5 ${step.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-night text-lg mb-1">{step.title}</h3>
                      <p className="text-warm-700/65 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── CTA footer ── */}
        <section style={{ background: '#1C1410' }} className="py-16 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="relative z-10 max-w-6xl mx-auto px-5 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.h2
                variants={fadeUp}
                className="font-serif font-bold text-white mb-4"
                style={{ fontSize: 'clamp(26px, 4vw, 36px)' }}
              >
                Prêt à transformer vos restes en festin ?
              </motion.h2>
              <motion.p variants={fadeUp} className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Rejoignez des milliers de cuisiniers qui ne jettent plus rien.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register" className="btn-primary px-8 py-3.5">
                  <Refrigerator className="w-4 h-4" />
                  Ouvrir mon frigo
                </Link>
                <Link href="/discover" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{ background: 'rgba(212,147,13,0.15)', color: '#F5E4A0', border: '1px solid rgba(212,147,13,0.25)' }}>
                  <Sparkles className="w-4 h-4" />
                  Voir les données
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Footer minimal ── */}
        <footer style={{ background: '#1C1410', borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-5">
          <div className="max-w-6xl mx-auto px-5 text-center">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Privacy Policy · Terms of Service · Contact
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ── Goal selection (new authenticated user) ──────────────────────────────

  return (
    <div className="min-h-screen bg-canvas-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm font-semibold text-brand-500 uppercase tracking-wider mb-3">Bienvenue !</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-night mb-3">
            {session?.user.name ? `Bonjour, ${session.user.name.split(' ')[0]} !` : 'Bienvenue !'}
          </h2>
          <p className="text-warm-700/60 text-lg">Quelle cuisine vous inspire le plus ?</p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5">
          {GOALS.map((g, i) => (
            <motion.button
              key={g.id}
              onClick={() => !savingGoal && handleSelectGoal(g.id)}
              disabled={savingGoal}
              className="relative rounded-3xl overflow-hidden aspect-[3/4] group text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 shadow-card"
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
              <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                {savingGoal ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin mb-3" />
                ) : null}
                <h3 className="font-serif text-2xl font-bold text-white mb-1.5">{g.label}</h3>
                <p className="text-white/65 text-sm">{g.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
