'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, Flame, Beef, Droplets, Wheat,
  AlertTriangle, CheckCircle2, ChefHat, Save, Loader2, Info,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MacroValues {
  kcal: number;
  proteins: number;
  fats: number;
  carbs: number;
}

interface HistoryEntry {
  recipeId: string;
  recipeName: string;
  recipeImage: string | null;
  consumedAt: string;
  nutrition: {
    kcal: number; proteins: number; fats: number; carbs: number;
    perServing: { kcal: number; proteins: number; fats: number; carbs: number };
    matchedCount: number;
  };
}

interface DailyData {
  consumed: MacroValues;
  target: MacroValues;
  tdeeBreakdown: { proteinKcal: number; fatKcal: number; carbsKcal: number };
  history: HistoryEntry[];
  profileComplete: boolean;
}

interface ProfileForm {
  age: string;
  weight: string;
  height: string;
  gender: string;
  activityLevel: string;
}

// ─── Macro config ─────────────────────────────────────────────────────────────

const MACROS = [
  { key: 'kcal' as const,     label: 'Calories',  unit: 'kcal', icon: Flame,    color: '#f97316', bg: 'bg-orange-50',   text: 'text-orange-600',   bar: 'from-orange-400 to-orange-500' },
  { key: 'proteins' as const, label: 'Protéines', unit: 'g',    icon: Beef,     color: '#3b82f6', bg: 'bg-blue-50',     text: 'text-blue-600',     bar: 'from-blue-400 to-blue-500' },
  { key: 'fats' as const,     label: 'Lipides',   unit: 'g',    icon: Droplets, color: '#f59e0b', bg: 'bg-amber-50',    text: 'text-amber-600',    bar: 'from-amber-400 to-amber-500' },
  { key: 'carbs' as const,    label: 'Glucides',  unit: 'g',    icon: Wheat,    color: '#10b981', bg: 'bg-emerald-50',  text: 'text-emerald-600',  bar: 'from-emerald-400 to-emerald-500' },
] as const;

const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sédentaire (peu ou pas d\'exercice)' },
  { value: 'light', label: 'Légèrement actif (1–3j / semaine)' },
  { value: 'moderate', label: 'Modérément actif (3–5j / semaine)' },
  { value: 'active', label: 'Très actif (6–7j / semaine)' },
  { value: 'very_active', label: 'Extrêmement actif (2x/jour)' },
];

// ─── Stagger variants ─────────────────────────────────────────────────────────

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MacroBar({ macro, consumed, target }: {
  macro: typeof MACROS[number];
  consumed: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 120) : 0;
  const over = pct > 110;
  const Icon = macro.icon;

  return (
    <motion.div variants={item} className={`${macro.bg} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${macro.text}`} />
          <span className="text-sm font-semibold text-stone-700">{macro.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {over && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          <span className={`text-xs font-bold ${over ? 'text-red-500' : macro.text}`}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="h-2.5 bg-white/60 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={`h-full rounded-full bg-gradient-to-r ${over ? 'from-red-400 to-red-500' : macro.bar}`}
        />
      </div>
      <div className="flex justify-between text-xs text-stone-500">
        <span><span className={`font-bold ${macro.text}`}>{consumed}</span> {macro.unit}</span>
        <span>/ {target} {macro.unit}</span>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const { data: session } = useSession();
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    age: '', weight: '', height: '', gender: '', activityLevel: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch daily data
  useEffect(() => {
    fetch('/api/nutrition/daily')
      .then((r) => r.json())
      .then((data) => { setDailyData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Pre-fill profile form from user data
  useEffect(() => {
    if (!session?.user.id) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then(({ user }) => {
        if (user?.profile) {
          setProfileForm({
            age: user.profile.age?.toString() ?? '',
            weight: user.profile.weight?.toString() ?? '',
            height: user.profile.height?.toString() ?? '',
            gender: user.profile.gender ?? '',
            activityLevel: user.profile.activityLevel ?? '',
          });
        }
      })
      .catch(() => {});
  }, [session?.user.id]);

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
      // Refetch daily data to update targets
      const res = await fetch('/api/nutrition/daily');
      if (res.ok) setDailyData(await res.json());
    } finally {
      setSaving(false);
    }
  };

  // Donut chart data (macro kcal split)
  const donutData = dailyData
    ? [
        { name: 'Protéines', value: dailyData.tdeeBreakdown.proteinKcal },
        { name: 'Lipides', value: dailyData.tdeeBreakdown.fatKcal },
        { name: 'Glucides', value: dailyData.tdeeBreakdown.carbsKcal },
      ]
    : [];

  return (
    <div className="space-y-8">

      {/* ── Page title ── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-4.5 h-4.5 text-white w-5 h-5" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Nutrition</h1>
        </div>
        <p className="text-stone-400 text-sm pl-12">Suivez vos apports journaliers et objectifs personnalisés</p>
      </motion.div>

      {/* ── Profile completion banner ── */}
      {!loading && dailyData && !dailyData.profileComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl"
        >
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Complétez votre profil</p>
            <p className="text-xs text-amber-700 mt-0.5">Renseignez votre âge, poids, taille et genre pour obtenir des objectifs caloriques personnalisés.</p>
          </div>
        </motion.div>
      )}

      {/* ── Profil section ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5"
      >
        <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">Mon profil physique</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
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
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Activité</label>
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
      </motion.div>

      {/* ── Objectives + Today side by side ── */}
      {loading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5 animate-pulse">
              <div className="h-4 bg-canvas-100 rounded w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-12 bg-canvas-100 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : dailyData && (
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Objectives donut card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5"
          >
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-2">Objectifs journaliers</h2>
            <p className="text-xs text-stone-400 mb-5">Calculés selon votre profil (Mifflin-St Jeor)</p>

            {/* Donut chart */}
            <div className="relative h-44 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={80}
                    paddingAngle={3} startAngle={90} endAngle={-270}
                    dataKey="value"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [`${v} kcal`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-stone-900">{dailyData.target.kcal}</span>
                <span className="text-xs text-stone-400">kcal/jour</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-5">
              {['Protéines', 'Lipides', 'Glucides'].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                  <span className="text-xs text-stone-500">{label}</span>
                </div>
              ))}
            </div>

            {/* Target numbers */}
            <div className="grid grid-cols-2 gap-2 mt-5">
              {MACROS.map(({ key, label, unit, icon: Icon, text, bg }) => (
                <div key={key} className={`${bg} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <Icon className={`w-3.5 h-3.5 ${text} flex-shrink-0`} />
                  <div>
                    <p className="text-[10px] text-stone-500">{label}</p>
                    <p className={`text-sm font-bold ${text}`}>{dailyData.target[key]} {unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Today's intake card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-lg font-bold text-stone-900">Aujourd&apos;hui</h2>
              <span className="text-xs text-stone-400">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <p className="text-xs text-stone-400 mb-5">Basé sur vos recettes consultées</p>

            {dailyData.history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-canvas-100 rounded-2xl flex items-center justify-center mb-3">
                  <ChefHat className="w-6 h-6 text-stone-300" />
                </div>
                <p className="text-stone-500 text-sm font-medium">Aucune recette aujourd&apos;hui</p>
                <p className="text-stone-400 text-xs mt-1">Consultez des recettes pour suivre vos apports</p>
                <Link href="/discover" className="mt-3 text-xs text-brand-500 hover:text-brand-600 font-medium">
                  Explorer les recettes →
                </Link>
              </div>
            ) : (
              <motion.div variants={container} initial="hidden" animate="visible" className="space-y-3">
                {MACROS.map((macro) => (
                  <MacroBar
                    key={macro.key}
                    macro={macro}
                    consumed={dailyData.consumed[macro.key]}
                    target={dailyData.target[macro.key]}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── History card ── */}
      {!loading && dailyData && dailyData.history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5"
        >
          <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">
            Recettes consultées aujourd&apos;hui
            <span className="text-stone-400 font-normal text-base ml-2">({dailyData.history.length})</span>
          </h2>

          <div className="space-y-3">
            {dailyData.history.map((entry, i) => (
              <motion.div
                key={entry.recipeId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <Link
                  href={`/recipes/${entry.recipeId}`}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-canvas-50 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                    {entry.recipeImage
                      ? <img src={entry.recipeImage} alt={entry.recipeName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <div className="flex items-center justify-center h-full"><ChefHat className="w-5 h-5 text-stone-300" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 text-sm truncate">{entry.recipeName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-orange-500 font-medium">{entry.nutrition.perServing.kcal} kcal</span>
                      <span className="text-xs text-stone-400">{entry.nutrition.perServing.proteins}g prot.</span>
                      <span className="text-xs text-stone-400">{entry.nutrition.perServing.carbs}g gluc.</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-stone-400">
                      {new Date(entry.consumedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {entry.nutrition.matchedCount === 0 && (
                      <span className="text-[10px] text-stone-300">données estimées</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
