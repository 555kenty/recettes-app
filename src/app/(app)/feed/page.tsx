'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, Sparkles, ChefHat, ArrowLeft } from 'lucide-react';
import { RecipeCard } from '@/app/components/RecipeCard';

const CUISINES = [
  { label: 'Française', emoji: '🇫🇷' },
  { label: 'Italian', emoji: '🇮🇹' },
  { label: 'American', emoji: '🇺🇸' },
  { label: 'Japanese', emoji: '🇯🇵' },
  { label: 'Indian', emoji: '🇮🇳' },
  { label: 'Mexican', emoji: '🇲🇽' },
  { label: 'Thai', emoji: '🇹🇭' },
  { label: 'British', emoji: '🇬🇧' },
  { label: 'Jamaican', emoji: '🇯🇲' },
  { label: 'Spanish', emoji: '🇪🇸' },
  { label: 'Chinese', emoji: '🇨🇳' },
  { label: 'Moroccan', emoji: '🇲🇦' },
];

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile'];

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  timeMinutes: number | null;
  difficulty: string | null;
  calories: number | null;
  cuisineType: string | null;
  category: string | null;
  tags: string[];
  likeCount: number;
  enriched: boolean;
  servings?: number | null;
}

export default function FeedPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ cuisineType: '', difficulty: '' });
  const [aiSearch, setAiSearch] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const fetchRecipes = useCallback(async (p: number, q: string, f: typeof filters, replace = false, useAi = false) => {
    setLoading(true);
    if (useAi && q.length >= 3) {
      const res = await fetch(`/api/recipes/semantic-search?q=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) { const data = await res.json(); setRecipes(replace ? data.recipes : (prev: Recipe[]) => [...prev, ...data.recipes]); setHasMore(false); }
    } else {
      const params = new URLSearchParams({ page: String(p), limit: '24' });
      if (q) params.set('search', q);
      if (f.cuisineType) params.set('cuisineType', f.cuisineType);
      if (f.difficulty) params.set('difficulty', f.difficulty);
      const res = await fetch(`/api/recipes?${params}`);
      if (res.ok) { const data = await res.json(); setRecipes((prev) => replace ? data.recipes : [...prev, ...data.recipes]); setHasMore(p < data.pages); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecipes(1, '', filters, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setPage(1); fetchRecipes(1, search, filters, true, aiSearch); }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, filters, aiSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading) { const next = page + 1; setPage(next); fetchRecipes(next, search, filters, false, aiSearch); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, search, filters, fetchRecipes]);

  const clearFilters = () => { setFilters({ cuisineType: '', difficulty: '' }); setSearch(''); };
  const activeFiltersCount = [filters.cuisineType, filters.difficulty, search].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-canvas-50">
      {/* ── Header sticky ── */}
      <div className="bg-white border-b border-canvas-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top bar */}
          <div className="flex items-center gap-3 py-3">
            <Link href="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors mr-2 flex-shrink-0">
              <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline font-semibold text-stone-900 text-sm">Cuisine<span className="text-brand-500">Connect</span></span>
            </Link>

            {/* Barre de recherche */}
            <div className="flex-1 relative">
              {aiSearch
                ? <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              }
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={aiSearch ? 'Décrivez la recette que vous cherchez...' : 'Rechercher par ingrédient, cuisine, plat...'}
                className={`w-full pl-10 pr-4 py-2.5 rounded-full text-sm border transition-all focus:outline-none focus:ring-2 ${
                  aiSearch
                    ? 'bg-violet-50 border-violet-200 focus:border-violet-400 focus:ring-violet-500/10'
                    : 'bg-canvas-100 border-canvas-200 focus:border-brand-400 focus:ring-brand-500/10 focus:bg-white'
                }`}
              />
            </div>

            {/* Bouton IA */}
            <button
              onClick={() => { setAiSearch(!aiSearch); setPage(1); setRecipes([]); }}
              title={aiSearch ? 'Désactiver la recherche IA' : 'Recherche sémantique IA'}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full border text-sm font-medium transition-all flex-shrink-0 ${
                aiSearch ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-stone-500 border-canvas-200 hover:border-brand-300 hover:text-brand-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">IA</span>
            </button>

            {/* Filtres */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-full border text-sm font-medium transition-all flex-shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-600 border-canvas-200 hover:border-stone-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filtres déroulants */}
          {showFilters && (
            <div className="py-3 border-t border-canvas-200">
              {/* Cuisines avec emojis drapeaux */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CUISINES.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setFilters((f) => ({ ...f, cuisineType: f.cuisineType === c.label ? '' : c.label }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                      filters.cuisineType === c.label ? 'bg-stone-900 text-white' : 'bg-canvas-100 text-stone-600 hover:bg-canvas-200'
                    }`}
                  >
                    <span>{c.emoji}</span> {c.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilters((f) => ({ ...f, difficulty: f.difficulty === d ? '' : d }))}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      filters.difficulty === d ? 'bg-stone-900 text-white' : 'bg-canvas-100 text-stone-600 hover:bg-canvas-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="px-3 py-1.5 rounded-full text-sm text-red-500 border border-red-200 hover:bg-red-50 flex items-center gap-1 transition-colors">
                    <X className="w-3 h-3" /> Effacer tout
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              {aiSearch ? 'Recherche sémantique IA' : filters.cuisineType ? `Cuisine ${filters.cuisineType}` : 'Toutes les recettes'}
            </h1>
            {recipes.length > 0 && (
              <p className="text-stone-400 text-sm mt-0.5">{recipes.length} recette{recipes.length > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {recipes.length === 0 && !loading ? (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg mb-4">Aucune recette trouvée</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-brand-500 hover:text-brand-600 text-sm font-medium">Effacer les filtres</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
            {/* Skeletons */}
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-canvas-200 animate-pulse shadow-card">
                <div className="aspect-[4/3] bg-canvas-100" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3 bg-canvas-100 rounded-full w-1/3" />
                  <div className="h-4 bg-canvas-100 rounded-full w-5/6" />
                  <div className="h-3 bg-canvas-100 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={loaderRef} className="h-10" />
      </div>
    </div>
  );
}
