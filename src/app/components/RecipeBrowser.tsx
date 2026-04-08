'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { RecipeCard } from '@/app/components/RecipeCard';

// ─── Cuisines avec icônes SVG personnalisées ─────────────────────────────────

const CUISINES = [
  // Europe
  { label: 'Française',    icon: '/cuisine-icons/icon-francaise.svg', region: 'Europe' },
  { label: 'Italian',      icon: '/cuisine-icons/icon-italian.svg', region: 'Europe' },
  { label: 'Spanish',      icon: '/cuisine-icons/icon-spanish.svg', region: 'Europe' },
  { label: 'British',      icon: '/cuisine-icons/icon-british.svg', region: 'Europe' },
  { label: 'Greek',        icon: '/cuisine-icons/icon-greek.svg', region: 'Europe' },
  // Afrique & Maghreb
  { label: 'Moroccan',     icon: '/cuisine-icons/icon-moroccan.svg', region: 'Afrique' },
  { label: 'Africaine',    icon: '/cuisine-icons/icon-africaine.svg', region: 'Afrique' },
  { label: 'Haïtienne',    icon: '/cuisine-icons/icon-haitienne.svg', region: 'Afrique' },
  { label: 'Antillaise',   icon: '/cuisine-icons/icon-antillaise.svg', region: 'Afrique' },
  { label: 'Réunionnaise', icon: '/cuisine-icons/icon-reunionnaise.svg', region: 'Afrique' },
  // Asie
  { label: 'Japanese',     icon: '/cuisine-icons/icon-japanese.svg', region: 'Asie' },
  { label: 'Chinese',      icon: '/cuisine-icons/icon-chinese.svg', region: 'Asie' },
  { label: 'Indian',       icon: '/cuisine-icons/icon-indian.svg', region: 'Asie' },
  { label: 'Thai',         icon: '/cuisine-icons/icon-thai.svg', region: 'Asie' },
  { label: 'Korean',       icon: '/cuisine-icons/icon-korean.svg', region: 'Asie' },
  { label: 'Vietnamese',   icon: '/cuisine-icons/icon-vietnamese.svg', region: 'Asie' },
  // Amériques
  { label: 'American',     icon: '/cuisine-icons/icon-american.svg', region: 'Amériques' },
  { label: 'Mexican',      icon: '/cuisine-icons/icon-mexican.svg', region: 'Amériques' },
  { label: 'Jamaican',     icon: '/cuisine-icons/icon-jamaican.svg', region: 'Amériques' },
  // Moyen-Orient
  { label: 'Middle Eastern', icon: '/cuisine-icons/icon-middleeastern.svg', region: 'Moyen-Orient' },
];

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile'];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Recipe {
  id: string; title: string; description: string | null; imageUrl: string | null;
  timeMinutes: number | null; difficulty: string | null; calories: number | null;
  cuisineType: string | null; category: string | null; tags: string[];
  likeCount: number; enriched: boolean; servings?: number | null;
}

interface RecipeBrowserProps {
  communityOnly?: boolean;
  pageTitle?: string;
}

// ─── CuisineCard ─────────────────────────────────────────────────────────────

function CuisineCard({ cuisine, active, onToggle }: {
  cuisine: typeof CUISINES[0];
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group focus:outline-none"
      aria-pressed={active}
    >
      <div className={`relative w-[60px] h-[60px] rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
        active
          ? 'ring-[2.5px] ring-brand-500 ring-offset-2 shadow-hover scale-105'
          : 'ring-1 ring-canvas-200 shadow-card group-hover:scale-105 group-hover:shadow-hover'
      }`}>
        <img
          src={cuisine.icon}
          alt={cuisine.label}
          className="w-full h-full object-contain p-2"
          loading="lazy"
          draggable={false}
        />
        {active && (
          <div className="absolute inset-0 bg-brand-500/10 rounded-2xl" />
        )}
      </div>
      <span className={`text-[11px] font-medium text-center leading-tight max-w-[60px] truncate transition-colors ${
        active ? 'text-brand-600 font-semibold' : 'text-warm-700/60 group-hover:text-warm-700'
      }`}>
        {cuisine.label}
      </span>
    </button>
  );
}

// ─── Skeleton card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-canvas-200 animate-pulse shadow-card" style={{ background: '#FFF8F0' }}>
      <div className="aspect-[4/3] bg-canvas-200" />
      <div className="p-4 space-y-2.5">
        <div className="h-3 bg-canvas-200 rounded-full w-1/3" />
        <div className="h-4 bg-canvas-200 rounded-full w-5/6" />
        <div className="h-3 bg-canvas-200 rounded-full w-2/3" />
      </div>
    </div>
  );
}

// ─── RecipeBrowser ────────────────────────────────────────────────────────────

export function RecipeBrowser({ communityOnly = false, pageTitle }: RecipeBrowserProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [showDifficultyFilter, setShowDifficultyFilter] = useState(false);
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
      if (communityOnly) params.set('community', 'true');
      if (q) params.set('search', q);
      if (f.cuisineType) params.set('cuisineType', f.cuisineType);
      if (f.difficulty) params.set('difficulty', f.difficulty);
      const res = await fetch(`/api/recipes?${params}`);
      if (res.ok) { const data = await res.json(); setRecipes((prev) => replace ? data.recipes : [...prev, ...data.recipes]); setHasMore(p < data.pages); }
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityOnly]);

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

  const defaultTitle = aiSearch
    ? 'Recherche sémantique IA'
    : filters.cuisineType ? `Cuisine ${filters.cuisineType}`
    : (pageTitle ?? 'Toutes les recettes');

  return (
    <>
      {/* ── Header sticky ── */}
      <div className="bg-canvas-100/95 backdrop-blur-sm border-b border-canvas-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Barre de recherche */}
          <div className="flex items-center gap-2 pt-3 pb-2">
            <div className="flex-1 relative">
              {aiSearch
                ? <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-pulse" />
                : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-700/40" />
              }
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={aiSearch ? 'Décrivez ce que vous cherchez...' : 'Un plat, un ingrédient...'}
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 ${
                  aiSearch
                    ? 'bg-brand-50 border-brand-200 focus:border-brand-400 focus:ring-brand-500/10'
                    : 'bg-white border-canvas-200 shadow-card focus:border-brand-400 focus:ring-brand-500/10'
                }`}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-700/40 hover:text-warm-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Toggle IA */}
            <button
              onClick={() => { setAiSearch(!aiSearch); setPage(1); setRecipes([]); }}
              title={aiSearch ? 'Désactiver la recherche IA' : 'Recherche sémantique IA'}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-shrink-0 ${
                aiSearch
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-white text-warm-700/60 border-canvas-200 hover:border-brand-200 hover:text-brand-500'
              }`}
              style={aiSearch ? { background: 'linear-gradient(135deg, #C4583A, #D4930D)', minWidth: 130 } : { minWidth: 130 }}
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiSearch ? 'animate-pulse' : ''}`} />
              <span className="text-xs">{aiSearch ? 'IA activée' : 'Recherche IA'}</span>
            </button>

            {/* Difficulté */}
            <button
              onClick={() => setShowDifficultyFilter(!showDifficultyFilter)}
              className={`relative flex items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all flex-shrink-0 ${
                filters.difficulty
                  ? 'bg-night text-white border-night'
                  : 'bg-white text-warm-700 border-canvas-200 hover:border-canvas-200 shadow-card'
              }`}
            >
              <span>{filters.difficulty || 'Niveau'}</span>
              {showDifficultyFilter ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Filtre difficulté dropdown */}
          {showDifficultyFilter && (
            <div className="flex gap-2 pb-2 pt-1 flex-wrap border-t border-canvas-200">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => { setFilters((f) => ({ ...f, difficulty: f.difficulty === d ? '' : d })); setShowDifficultyFilter(false); }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    filters.difficulty === d
                      ? 'bg-night text-white border-night'
                      : 'bg-canvas-50 text-warm-700 border-canvas-200 hover:bg-canvas-100'
                  }`}
                >
                  {d}
                </button>
              ))}
              {filters.difficulty && (
                <button
                  onClick={() => { setFilters((f) => ({ ...f, difficulty: '' })); setShowDifficultyFilter(false); }}
                  className="px-3 py-1.5 rounded-xl text-xs text-brand-500 border border-brand-100 hover:bg-brand-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Effacer
                </button>
              )}
            </div>
          )}

          {/* ── Cuisine cards avec icônes SVG ── */}
          <div className="flex gap-4 overflow-x-auto py-3 scrollbar-hide -mx-1 px-1">
            {CUISINES.map((c) => (
              <CuisineCard
                key={c.label}
                cuisine={c}
                active={filters.cuisineType === c.label}
                onToggle={() => setFilters((f) => ({ ...f, cuisineType: f.cuisineType === c.label ? '' : c.label }))}
              />
            ))}
          </div>

          {/* Chips filtres actifs */}
          {(filters.difficulty || search) && (
            <div className="flex items-center gap-2 pb-2 flex-wrap">
              {filters.difficulty && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-canvas-200 text-warm-700 text-xs font-medium rounded-full">
                  {filters.difficulty}
                  <button onClick={() => setFilters((f) => ({ ...f, difficulty: '' }))} className="hover:text-brand-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-canvas-200 text-warm-700 text-xs font-medium rounded-full">
                  &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch('')} className="hover:text-brand-500 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeFiltersCount > 1 && (
                <button onClick={clearFilters} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                  Tout effacer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-night">{defaultTitle}</h1>
          {recipes.length > 0 && (
            <p className="text-warm-700/50 text-sm mt-0.5">{recipes.length} recette{recipes.length > 1 ? 's' : ''}</p>
          )}
        </div>

        {recipes.length === 0 && !loading ? (
          <div className="text-center py-24">
            <p className="text-warm-700/50 text-lg mb-4">Aucune recette trouvée</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-brand-500 hover:text-brand-600 text-sm font-medium">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {recipes.map((r) => (
              <motion.div
                key={r.id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
              >
                <RecipeCard recipe={r} />
              </motion.div>
            ))}
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </motion.div>
        )}

        <div ref={loaderRef} className="h-10" />
      </div>
    </>
  );
}
