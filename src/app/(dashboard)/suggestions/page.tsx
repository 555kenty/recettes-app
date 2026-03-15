'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Lightbulb } from 'lucide-react';
import { RecipeCard } from '@/app/components/RecipeCard';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PantryEntry {
  id: string;
  quantity: string | null;
  ingredient: { id: string; name: string; category: string | null };
}

interface Recipe {
  id: string;
  title: string;
  timeMinutes: number | null;
  imageUrl: string | null;
  likeCount: number;
  calories: number | null;
  difficulty: string | null;
  tags: string[];
  description: string | null;
  cuisineType: string | null;
  category: string | null;
  enriched: boolean;
  servings?: number | null;
  matchScore?: number;
  missingIngredients?: string[];
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function SuggestionsPage() {
  const [pantry, setPantry] = useState<PantryEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    // Load pantry first
    const pantryRes = await fetch('/api/pantry');
    if (!pantryRes.ok) { setLoading(false); return; }
    const { pantry: pantryData } = await pantryRes.json();
    setPantry(pantryData);

    // Then load suggestions if pantry has items
    if (pantryData.length > 0) {
      const sugRes = await fetch('/api/recipes/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pantryItems: pantryData.map((p: PantryEntry) => p.ingredient.name) }),
      });
      if (sugRes.ok) {
        const data = await sugRes.json();
        setSuggestions(data.recipes);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Basé sur votre frigo</p>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Suggestions</h2>
        {!loading && (
          <p className="text-stone-500 text-sm mt-1">{pantry.length} ingrédient{pantry.length !== 1 ? 's' : ''} en stock</p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
      ) : pantry.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
          <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lightbulb className="w-8 h-8 text-stone-300" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Frigo vide</h3>
          <p className="text-stone-500 text-sm mb-6">Ajoutez des ingrédients dans votre frigo pour voir des suggestions de recettes.</p>
          <Link href="/fridge" className="btn-primary">Remplir mon frigo</Link>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
          <p className="text-stone-500">Aucune recette trouvée avec vos ingrédients actuels.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {suggestions.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              matchScore={r.matchScore}
              missingIngredients={r.missingIngredients}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
