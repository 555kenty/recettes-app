'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity, Flame, Beef, Droplets, Wheat, AlertTriangle, CheckCircle2,
  ChefHat, Save, Loader2, Info, ChevronLeft, ChevronRight, Calendar,
  Plus, X, Trash2, Search, ImagePlus, UtensilsCrossed,
} from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MacroValues { kcal: number; proteins: number; fats: number; carbs: number }

interface MealLog {
  id: string;
  name: string;
  imageUrl: string | null;
  recipeId: string | null;
  kcal: number;
  proteins: number;
  fats: number;
  carbs: number;
  servings: number;
  loggedAt: string;
}

interface DailyData {
  consumed: MacroValues;
  target:   MacroValues;
  tdeeBreakdown: { proteinKcal: number; fatKcal: number; carbsKcal: number };
  logs: MealLog[];
  profileComplete: boolean;
}

interface ProfileForm { age: string; weight: string; height: string; gender: string; activityLevel: string }
interface IngredientRow { name: string; quantity: string; unit: string }
interface RecipeResult { id: string; title: string; imageUrl: string | null; cuisineType: string | null; timeMinutes: number | null }

// ─── Constants ────────────────────────────────────────────────────────────────

const MACROS = [
  { key: 'kcal'     as const, label: 'Calories',  unit: 'kcal', icon: Flame,    color: '#f97316', bg: 'bg-orange-50',  text: 'text-orange-600',  bar: 'from-orange-400 to-orange-500'  },
  { key: 'proteins' as const, label: 'Protéines', unit: 'g',    icon: Beef,     color: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-600',    bar: 'from-blue-400 to-blue-500'    },
  { key: 'fats'     as const, label: 'Lipides',   unit: 'g',    icon: Droplets, color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-600',   bar: 'from-amber-400 to-amber-500'   },
  { key: 'carbs'    as const, label: 'Glucides',  unit: 'g',    icon: Wheat,    color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'from-emerald-400 to-emerald-500'},
] as const;

const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sédentaire (peu ou pas d\'exercice)' },
  { value: 'light',       label: 'Légèrement actif (1–3j / semaine)' },
  { value: 'moderate',    label: 'Modérément actif (3–5j / semaine)' },
  { value: 'active',      label: 'Très actif (6–7j / semaine)' },
  { value: 'very_active', label: 'Extrêmement actif (2x/jour)' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({ macro, consumed, target }: { macro: typeof MACROS[number]; consumed: number; target: number }) {
  const pct  = target > 0 ? Math.min((consumed / target) * 100, 120) : 0;
  const over = pct > 110;
  const Icon = macro.icon;
  return (
    <motion.div variants={fadeUp} className={`${macro.bg} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${macro.text}`} />
          <span className="text-sm font-semibold text-stone-700">{macro.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {over && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          <span className={`text-xs font-bold ${over ? 'text-red-500' : macro.text}`}>{Math.round(pct)}%</span>
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

// ─── AddMealModal ─────────────────────────────────────────────────────────────

function AddMealModal({ onClose, onAdded, initialDate }: { onClose: () => void; onAdded: (date: string) => void; initialDate?: string }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<'recipe' | 'custom'>('recipe');
  const [targetDate, setTargetDate] = useState(initialDate ?? todayStr);

  // ── Recipe tab state
  const [search, setSearch]                     = useState('');
  const [results, setResults]                   = useState<RecipeResult[]>([]);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [selected, setSelected]                 = useState<RecipeResult | null>(null);
  const [servings, setServings]                 = useState('1');

  // ── Custom tab state
  const [customName, setCustomName]             = useState('');
  const [customIngredients, setCustomIngredients] = useState<IngredientRow[]>([{ name: '', quantity: '', unit: '' }]);
  const [customServings, setCustomServings]     = useState('1');
  const [customImage, setCustomImage]           = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);

  const [saving, setSaving]   = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recipe search
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/recipes?search=${encodeURIComponent(search)}&limit=10`);
        if (res.ok) { const d = await res.json(); setResults(d.recipes ?? []); }
      } finally { setSearchLoading(false); }
    }, 350);
  }, [search]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCustomImage(f);
    setCustomImagePreview(URL.createObjectURL(f));
  };

  const addIngredient    = () => setCustomIngredients((p) => [...p, { name: '', quantity: '', unit: '' }]);
  const removeIngredient = (i: number) => setCustomIngredients((p) => p.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof IngredientRow, val: string) =>
    setCustomIngredients((p) => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const handleAdd = async () => {
    setSaving(true);
    try {
      if (tab === 'recipe' && selected) {
        await fetch('/api/meal-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: selected.id, servings: parseFloat(servings) || 1, date: targetDate }),
        });
      } else {
        if (!customName.trim()) return;
        let imageUrl: string | null = null;
        if (customImage) {
          const fd = new FormData();
          fd.append('file', customImage);
          const r = await fetch('/api/recipes/upload-image', { method: 'POST', body: fd });
          if (r.ok) { const d = await r.json(); imageUrl = d.imageUrl ?? null; }
        }
        await fetch('/api/meal-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customName.trim(),
            imageUrl,
            ingredients: customIngredients.filter((i) => i.name.trim()),
            servings: parseFloat(customServings) || 1,
            date: targetDate,
          }),
        });
      }
      onAdded(targetDate);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-float max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-canvas-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-brand-500" />
            <h3 className="font-serif text-lg font-bold text-stone-900">Ajouter un repas</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-canvas-100 transition-colors">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Date selector */}
        <div className="px-5 pt-3 pb-1 flex-shrink-0">
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Date du repas</label>
          <input
            type="date"
            value={targetDate}
            max={todayStr}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
          {(['recipe', 'custom'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-brand-500 text-white' : 'bg-canvas-100 text-stone-600 hover:bg-canvas-200'
              }`}
            >
              {t === 'recipe' ? '📖 Recette existante' : '🍳 Repas maison'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'recipe' ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                  placeholder="Chercher une recette..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm"
                  autoFocus
                />
              </div>

              {/* Results */}
              {searchLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-brand-500 animate-spin" /></div>}
              {results.length > 0 && !selected && (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-canvas-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                        {r.imageUrl
                          ? <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                          : <div className="flex items-center justify-center h-full"><ChefHat className="w-4 h-4 text-stone-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{r.title}</p>
                        {r.cuisineType && <p className="text-xs text-stone-400">{r.cuisineType}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected recipe */}
              {selected && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                      {selected.imageUrl
                        ? <img src={selected.imageUrl} alt={selected.title} className="w-full h-full object-cover" />
                        : <div className="flex items-center justify-center h-full"><ChefHat className="w-5 h-5 text-stone-300" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 text-sm truncate">{selected.title}</p>
                      {selected.cuisineType && <p className="text-xs text-stone-400">{selected.cuisineType}</p>}
                    </div>
                    <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-stone-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">Nombre de portions</label>
                  <input
                    type="number" min="0.5" step="0.5"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    className="w-24 px-3 py-2 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm text-center"
                  />
                </motion.div>
              )}
            </>
          ) : (
            <>
              {/* Custom meal name */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Nom du plat *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex : Riz collé aux pois"
                  className="w-full px-3 py-2.5 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm"
                  autoFocus
                />
              </div>

              {/* Photo */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Photo (optionnelle)</label>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  {customImagePreview ? (
                    <div className="relative rounded-xl overflow-hidden h-32">
                      <img src={customImagePreview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setCustomImage(null); setCustomImagePreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 rounded-xl border-2 border-dashed border-canvas-200 flex items-center justify-center gap-2 hover:border-brand-300 hover:bg-brand-50 transition-colors">
                      <ImagePlus className="w-5 h-5 text-stone-300" />
                      <span className="text-xs text-stone-400">Ajouter une photo</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">Ingrédients</label>
                <div className="space-y-2">
                  {customIngredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text" value={ing.name}
                        onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                        placeholder="Ingrédient"
                        className="flex-1 px-3 py-2 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm"
                      />
                      <input
                        type="text" value={ing.quantity}
                        onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                        placeholder="Qté"
                        className="w-16 px-2 py-2 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm"
                      />
                      <input
                        type="text" value={ing.unit}
                        onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                        placeholder="g/ml"
                        className="w-14 px-2 py-2 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm"
                      />
                      {customIngredients.length > 1 && (
                        <button type="button" onClick={() => removeIngredient(i)} className="text-stone-300 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addIngredient} className="mt-2 flex items-center gap-1 text-brand-500 text-xs hover:text-brand-600">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un ingrédient
                </button>
              </div>

              {/* Servings */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Nombre de portions</label>
                <input
                  type="number" min="0.5" step="0.5"
                  value={customServings}
                  onChange={(e) => setCustomServings(e.target.value)}
                  className="w-24 px-3 py-2 rounded-xl border border-canvas-200 focus:border-brand-400 focus:outline-none text-sm text-center"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-canvas-100 flex-shrink-0">
          <button
            onClick={handleAdd}
            disabled={saving || (tab === 'recipe' ? !selected : !customName.trim())}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Ajout en cours...' : 'Ajouter ce repas'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── NutritionCalendar ────────────────────────────────────────────────────────

interface CalDay { id: string; name: string; imageUrl: string | null; kcal: number; loggedAt: string }

function NutritionCalendar({ onAddForDay }: { onAddForDay: (date: string) => void }) {
  const now = new Date();
  const [year, setYear]           = useState(now.getFullYear());
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [days, setDays]           = useState<Record<string, CalDay[]>>({});
  const [calLoading, setCalLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const reload = useCallback(() => {
    setCalLoading(true);
    setSelectedDay(null);
    fetch(`/api/nutrition/history?month=${monthKey}`)
      .then((r) => r.json())
      .then(({ days: d }) => { setDays(d ?? {}); setCalLoading(false); })
      .catch(() => setCalLoading(false));
  }, [monthKey]);

  useEffect(() => { reload(); }, [reload]);

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); };

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel   = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const todayKey     = now.toISOString().split('T')[0];
  const selectedEntries = selectedDay ? (days[selectedDay] ?? []) : [];
  const totalKcal    = selectedEntries.reduce((s, e) => s + (e.kcal ?? 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <h2 className="font-serif text-lg font-bold text-stone-900">Calendrier nutritionnel</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-canvas-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-stone-500" />
          </button>
          <span className="text-sm font-semibold text-stone-700 capitalize min-w-[120px] text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-canvas-100 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-stone-400 py-1">{d}</div>
        ))}
      </div>

      {calLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-brand-500 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dayKey    = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEntries = !!days[dayKey]?.length;
            const isToday   = dayKey === todayKey;
            const isSelected = dayKey === selectedDay;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : dayKey)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-2 transition-all text-sm font-medium
                  ${isSelected ? 'bg-brand-500 text-white' : isToday ? 'bg-brand-50 text-brand-600' : 'text-stone-700 hover:bg-canvas-50'}`}
              >
                {day}
                {hasEntries && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white/70' : 'bg-brand-500'}`} />}
              </button>
            );
          })}
        </div>
      )}

      {selectedDay && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4 pt-4 border-t border-canvas-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-stone-800">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="flex items-center gap-2">
              {totalKcal > 0 && (
                <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">~{totalKcal} kcal</span>
              )}
              <button
                onClick={() => onAddForDay(selectedDay)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">Aucun repas enregistré ce jour-là</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas-50">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                    {entry.imageUrl
                      ? <img src={entry.imageUrl} alt={entry.name} className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full"><ChefHat className="w-4 h-4 text-stone-300" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{entry.name}</p>
                    {entry.kcal > 0 && <p className="text-xs text-stone-400">{entry.kcal} kcal</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const { data: session }                       = useSession();
  const [dailyData, setDailyData]               = useState<DailyData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [profileForm, setProfileForm]           = useState<ProfileForm>({ age: '', weight: '', height: '', gender: '', activityLevel: '' });
  const [saving, setSaving]                     = useState(false);
  const [saved, setSaved]                       = useState(false);
  const [showModal, setShowModal]               = useState(false);
  const [modalDate, setModalDate]               = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [calKey, setCalKey]                     = useState(0); // increment to force calendar reload

  const fetchDaily = useCallback(async () => {
    const res = await fetch('/api/nutrition/daily');
    if (res.ok) { const d = await res.json(); setDailyData(d); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  useEffect(() => {
    if (!session?.user.id) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then(({ user }) => {
        if (user?.profile) {
          setProfileForm({
            age:           user.profile.age?.toString()       ?? '',
            weight:        user.profile.weight?.toString()    ?? '',
            height:        user.profile.height?.toString()    ?? '',
            gender:        user.profile.gender                ?? '',
            activityLevel: user.profile.activityLevel         ?? '',
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
          age:           profileForm.age    ? parseInt(profileForm.age)       : null,
          weight:        profileForm.weight ? parseFloat(profileForm.weight)  : null,
          height:        profileForm.height ? parseFloat(profileForm.height)  : null,
          gender:        profileForm.gender        || null,
          activityLevel: profileForm.activityLevel || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      fetchDaily();
    } finally { setSaving(false); }
  };

  const openModal = (date?: string) => { setModalDate(date); setShowModal(true); };

  const handleAdded = (date: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    fetchDaily(); // always refresh today's totals
    if (date !== todayStr) setCalKey((k) => k + 1); // force calendar reload for past days
  };

  const deleteLog = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/meal-logs/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchDaily(); setCalKey((k) => k + 1); }
    } finally { setDeletingId(null); }
  };

  const donutData = dailyData
    ? [
        { name: 'Protéines', value: dailyData.tdeeBreakdown.proteinKcal },
        { name: 'Lipides',   value: dailyData.tdeeBreakdown.fatKcal     },
        { name: 'Glucides',  value: dailyData.tdeeBreakdown.carbsKcal   },
      ]
    : [];

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showModal && (
          <AddMealModal
            onClose={() => setShowModal(false)}
            onAdded={handleAdded}
            initialDate={modalDate}
          />
        )}
      </AnimatePresence>

      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Nutrition</h1>
        </div>
        <p className="text-stone-400 text-sm pl-12">Suivez vos apports journaliers et objectifs personnalisés</p>
      </motion.div>

      {/* Profile banner */}
      {!loading && dailyData && !dailyData.profileComplete && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Complétez votre profil</p>
            <p className="text-xs text-amber-700 mt-0.5">Renseignez votre âge, poids, taille et genre pour obtenir des objectifs caloriques personnalisés.</p>
          </div>
        </motion.div>
      )}

      {/* Profile form */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5">
        <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">Mon profil physique</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Âge</label>
            <input type="number" min="10" max="100" value={profileForm.age} onChange={(e) => setProfileForm((p) => ({ ...p, age: e.target.value }))} placeholder="ans" className="input-base w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Poids (kg)</label>
            <input type="number" min="30" max="300" step="0.1" value={profileForm.weight} onChange={(e) => setProfileForm((p) => ({ ...p, weight: e.target.value }))} placeholder="kg" className="input-base w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Taille (cm)</label>
            <input type="number" min="100" max="250" value={profileForm.height} onChange={(e) => setProfileForm((p) => ({ ...p, height: e.target.value }))} placeholder="cm" className="input-base w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Genre</label>
            <select value={profileForm.gender} onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))} className="input-base w-full text-sm">
              <option value="">—</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Activité</label>
            <select value={profileForm.activityLevel} onChange={(e) => setProfileForm((p) => ({ ...p, activityLevel: e.target.value }))} className="input-base w-full text-sm">
              <option value="">—</option>
              {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé !' : 'Sauvegarder'}
        </button>
      </motion.div>

      {/* Objectives + Today */}
      {loading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5 animate-pulse">
              <div className="h-4 bg-canvas-100 rounded w-32 mb-4" />
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-12 bg-canvas-100 rounded-xl" />)}</div>
            </div>
          ))}
        </div>
      ) : dailyData && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Objectives donut */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-2">Objectifs journaliers</h2>
            <p className="text-xs text-stone-400 mb-5">Calculés selon votre profil (Mifflin-St Jeor)</p>
            <div className="relative h-44 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={58} outerRadius={80} paddingAngle={3} startAngle={90} endAngle={-270} dataKey="value">
                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v} kcal`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-stone-900">{dailyData.target.kcal}</span>
                <span className="text-xs text-stone-400">kcal/jour</span>
              </div>
            </div>
            <div className="flex justify-center gap-5">
              {['Protéines', 'Lipides', 'Glucides'].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                  <span className="text-xs text-stone-500">{label}</span>
                </div>
              ))}
            </div>
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

          {/* Today */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="bg-white rounded-2xl border border-canvas-200 shadow-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-lg font-bold text-stone-900">Aujourd&apos;hui</h2>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            <p className="text-xs text-stone-400 mb-5">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

            {dailyData.logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
                <div className="w-12 h-12 bg-canvas-100 rounded-2xl flex items-center justify-center mb-3">
                  <UtensilsCrossed className="w-6 h-6 text-stone-300" />
                </div>
                <p className="text-stone-500 text-sm font-medium">Aucun repas enregistré</p>
                <p className="text-stone-400 text-xs mt-1">Ajoutez vos repas pour suivre vos apports</p>
                <button onClick={() => openModal()} className="mt-3 text-xs text-brand-500 hover:text-brand-600 font-medium">
                  + Ajouter un repas
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 flex-1">
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
                  {MACROS.map((macro) => (
                    <MacroBar key={macro.key} macro={macro} consumed={dailyData.consumed[macro.key]} target={dailyData.target[macro.key]} />
                  ))}
                </motion.div>

                {/* Meal list */}
                <div className="border-t border-canvas-100 pt-4 space-y-2">
                  {dailyData.logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                        {log.imageUrl
                          ? <img src={log.imageUrl} alt={log.name} className="w-full h-full object-cover" />
                          : <div className="flex items-center justify-center h-full"><ChefHat className="w-4 h-4 text-stone-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        {log.recipeId
                          ? <Link href={`/recipes/${log.recipeId}`} className="text-sm font-medium text-stone-800 hover:text-brand-500 truncate block">{log.name}</Link>
                          : <p className="text-sm font-medium text-stone-800 truncate">{log.name}</p>}
                        <p className="text-xs text-stone-400">
                          {log.kcal > 0 ? `${log.kcal} kcal` : 'macros non calculées'}
                          {log.servings > 1 ? ` · ${log.servings} portions` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteLog(log.id)}
                        disabled={deletingId === log.id}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all"
                      >
                        {deletingId === log.id
                          ? <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Calendar */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
        <NutritionCalendar key={calKey} onAddForDay={(date) => openModal(date)} />
      </motion.div>
    </div>
  );
}
