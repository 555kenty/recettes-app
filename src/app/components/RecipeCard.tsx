'use client';

import Link from 'next/link';
import { Heart, Clock, Flame, ChefHat } from 'lucide-react';
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
}

interface RecipeCardProps {
  recipe: Recipe;
  showFavorite?: boolean;
  onFavorite?: (id: string) => void;
}

export function RecipeCard({ recipe, showFavorite = true, onFavorite }: RecipeCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(recipe.likeCount ?? 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const method = liked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/recipes/${recipe.id}/like`, { method });
    if (res.ok) {
      const data = await res.json();
      setLiked(!liked);
      setLikeCount(data.likeCount);
    }

    onFavorite?.(recipe.id);
  };

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-video bg-slate-100 overflow-hidden">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat className="w-12 h-12 text-slate-200" />
            </div>
          )}

          {/* Badge cuisine */}
          {recipe.cuisineType && (
            <span className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full font-medium">
              {recipe.cuisineType}
            </span>
          )}

          {/* Badge enrichi */}
          {recipe.enriched && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-rose-500/90 text-white text-xs rounded-full font-medium">
              ✨ IA
            </span>
          )}

          {/* Bouton like */}
          {showFavorite && (
            <button
              onClick={handleLike}
              className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${liked ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`}
              />
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className="p-4">
          <h3 className="font-bold text-slate-800 line-clamp-1 mb-1 group-hover:text-rose-500 transition-colors">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="text-slate-500 text-sm line-clamp-2 mb-3">{recipe.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-400">
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
            {recipe.difficulty && (
              <span className="ml-auto px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">
                {recipe.difficulty}
              </span>
            )}
          </div>

          {likeCount > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
              {likeCount} j&apos;aime
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
