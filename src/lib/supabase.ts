import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types pour la base de données
export interface Recipe {
  id: string;
  title: string;
  description: string;
  image_url: string;
  time_minutes: number;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  calories: number;
  cuisine_type: string;
  category: string;
  ingredients: { name: string; quantity: string; category: string }[];
  steps: { order: number; description: string }[];
  tags: string[];
}

export interface UserFavorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}
