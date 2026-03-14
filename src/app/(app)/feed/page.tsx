'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import { RecipeCard } from '@/app/components/RecipeCard';

const CUISINES = ['Française', 'Italian', 'American', 'Japanese', 'Indian', 'Mexican', 'Thai', 'British', 'Jamaican', 'Spanish', 'Chinese', 'Moroccan'];
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

  const fetchRecipes = useCallback(async (p: number, q: string, f: typeof filters, replace = false, useAi = false) => {
    setLoading(true);

    if (useAi && q.length >= 3) {
      const res = await fetch(`/api/recipes/semantic-search?q=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(replace ? data.recipes : (prev: Recipe[]) => [...prev, ...data.recipes]);
        setHasMore(false); // semantic search returns all at once
      }
    } else {
      const params = new URLSearchParams({ page: String(p), limit: '24' });
      if (q) params.set('search', q);
      if (f.cuisineType) params.set('cuisineType', f.cuisineType);
      if (f.difficulty) params.set('difficulty', f.difficulty);

      const res = await fetch(`/api/recipes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes((prev) => replace ? data.recipes : [...prev, ...data.recipes]);
        setHasMore(p < data.pages);
      }
    }
    setLoading(false);
  }, []);

  // Chargement initial
  useEffect(() => { fetchRecipes(1, '', filters, true); }, []);

  // Recherche avec debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchRecipes(1, search, filters, true, aiSearch);
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, filters, aiSearch]);

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchRecipes(next, search, filters, false, aiSearch);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, search, filters, fetchRecipes]);

  const clearFilters = () => {
    setFilters({ cuisineType: '', difficulty: '' });
    setSearch('');
  };

  const activeFiltersCount = [filters.cuisineType, filters.difficulty, search].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              {aiSearch
                ? <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              }
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={aiSearch ? 'Décrivez la recette que vous cherchez...' : 'Rechercher une recette, un ingrédient...'}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${aiSearch ? 'bg-rose-50 border-rose-300 focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-400'}`}
              />
            </div>
            <button
              title={aiSearch ? 'Désactiver la recherche IA' : 'Activer la recherche sémantique IA'}
              onClick={() => { setAiSearch(!aiSearch); setPage(1); setRecipes([]); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors text-sm font-medium ${aiSearch ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-500'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">IA</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors text-sm font-medium ${showFilters ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filtres */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2 pb-1">
              {/* Cuisines */}
              {CUISINES.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilters((f) => ({ ...f, cuisineType: f.cuisineType === c ? '' : c }))}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${filters.cuisineType === c ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {c}
                </button>
              ))}
              <div className="w-full h-px bg-slate-100 my-1" />
              {/* Difficultés */}
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setFilters((f) => ({ ...f, difficulty: f.difficulty === d ? '' : d }))}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${filters.difficulty === d ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {d}
                </button>
              ))}
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="px-3 py-1 rounded-full text-sm text-red-500 border border-red-200 hover:bg-red-50 flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{aiSearch ? '✨ Recherche sémantique IA' : 'Toutes les recettes'}</h1>
            {recipes.length > 0 && <p className="text-slate-500 text-sm">{recipes.length} recette{recipes.length > 1 ? 's' : ''}{aiSearch ? ' trouvées par IA' : ' chargées'}</p>}
          </div>
        </div>

        {recipes.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">Aucune recette trouvée</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="mt-4 text-rose-500 hover:underline text-sm">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
            {/* Skeletons pendant chargement */}
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
                <div className="aspect-video bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sentinel infinite scroll */}
        <div ref={loaderRef} className="h-10" />
      </div>
    </div>
  );
}
