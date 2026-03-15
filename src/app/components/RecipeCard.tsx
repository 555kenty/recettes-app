'use client';

import Link from 'next/link';
import { Heart, Clock, Flame, ChefHat, Users } from 'lucide-react';
import { useState } from 'react';

interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  timeMinutes?: number | null;
  difficulty?: string | null;
  calories?: number | null;
  cuisineType?: string | null;
  category?: string | null;
  tags?: string[];
  likeCount?: number;
  enriched?: boolean;
  servings?: number | null;
}

interface RecipeCardProps {
  recipe: Recipe;
  showFavorite?: boolean;
  onFavorite?: (id: string) => void;
  matchScore?: number;
  missingIngredients?: string[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Facile: 'text-emerald-700 bg-emerald-50',
  Moyen: 'text-amber-700 bg-amber-50',
  Difficile: 'text-red-700 bg-red-50',
};

export function RecipeCard({ recipe, showFavorite = true, onFavorite, matchScore, missingIngredients }: RecipeCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(recipe.likeCount ?? 0);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const method = liked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/recipes/${recipe.id}/like`, { method });
    if (res.ok) {
      const data = await res.json();
      setLiked(!liked);
      setLikeCount(data.likeCount);
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 400);
    }
    onFavorite?.(recipe.id);
  };

  const diffColor = recipe.difficulty ? (DIFFICULTY_COLORS[recipe.difficulty] ?? 'text-stone-600 bg-stone-100') : null;

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-2xl">
      <article className="bg-white rounded-2xl overflow-hidden shadow-card border border-canvas-200/60 hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300">

        {/* Image */}
        <div className="relative aspect-[4/3] bg-canvas-100 overflow-hidden">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat className="w-10 h-10 text-stone-200" />
            </div>
          )}

          {/* Overlay gradient permanent en bas */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          {/* Badge cuisine en bas à gauche */}
          {recipe.cuisineType && (
            <span className="absolute bottom-2.5 left-3 px-2 py-0.5 bg-stone-900/75 backdrop-blur-sm text-white text-[11px] font-medium rounded-full tracking-wide">
              {recipe.cuisineType}
            </span>
          )}

          {/* Badge IA en haut à gauche */}
          {recipe.enriched && (
            <span className="absolute top-2.5 left-3 px-2 py-0.5 bg-violet-600/90 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full tracking-wider uppercase">
              ✦ IA
            </span>
          )}

          {/* Badge match score */}
          {matchScore !== undefined && (
            <span className={`absolute top-2.5 left-3 px-2 py-0.5 text-[11px] font-bold rounded-full backdrop-blur-sm ${
              matchScore >= 0.8 ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
            }`}>
              {Math.round(matchScore * 100)}% match
            </span>
          )}

          {/* Bouton like */}
          {showFavorite && (
            <button
              onClick={handleLike}
              aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full hover:bg-white shadow-sm transition-all duration-150 hover:scale-110"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-all duration-200 ${
                  likeAnimating ? 'scale-150' : 'scale-100'
                } ${liked ? 'fill-brand-500 text-brand-500' : 'text-stone-500'}`}
              />
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className="p-4">
          {/* Catégorie */}
          {recipe.category && (
            <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-wider mb-1.5">
              {recipe.category}
            </p>
          )}

          {/* Titre */}
          <h3 className="font-serif font-semibold text-stone-900 line-clamp-2 text-[15px] leading-snug mb-3 group-hover:text-brand-600 transition-colors duration-150">
            {recipe.title}
          </h3>

          {/* Meta */}
          <div className="flex items-center gap-2.5 text-[12px] text-stone-400 flex-wrap">
            {recipe.timeMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {recipe.timeMinutes} min
              </span>
            )}
            {recipe.calories && (
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {recipe.calories} kcal
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {recipe.servings}
              </span>
            )}
            {diffColor && recipe.difficulty && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold ${diffColor}`}>
                {recipe.difficulty}
              </span>
            )}
          </div>

          {/* Ingrédients manquants */}
          {missingIngredients && missingIngredients.length > 0 && (
            <p className="mt-2 text-[11px] text-stone-400 line-clamp-1">
              Manque : {missingIngredients.slice(0, 3).join(', ')}{missingIngredients.length > 3 ? ` +${missingIngredients.length - 3}` : ''}
            </p>
          )}

          {/* Likes */}
          {likeCount > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-canvas-200 flex items-center gap-1 text-[11px] text-stone-400">
              <Heart className="w-3 h-3 fill-brand-500 text-brand-500" />
              {likeCount}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
