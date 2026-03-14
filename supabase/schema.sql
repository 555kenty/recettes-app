-- ============================================
-- SCHÉMA CUISINECONNECT - SUPABASE
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: RECIPES (Recettes)
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  time_minutes INTEGER,
  difficulty TEXT CHECK (difficulty IN ('Facile', 'Moyen', 'Difficile')),
  calories INTEGER,
  cuisine_type TEXT, -- 'Antillais', 'Haïtien', 'Français', etc.
  category TEXT, -- 'Plat principal', 'Entrée', 'Dessert'
  ingredients JSONB DEFAULT '[]', -- [{"name": "Pâtes", "quantity": "400g"}]
  steps JSONB DEFAULT '[]', -- [{"order": 1, "description": "..."}]
  tags TEXT[] DEFAULT '{}',
  source_api TEXT, -- 'spoonacular', 'manual'
  source_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine_type);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- ============================================
-- TABLE: INGREDIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'Légumes', 'Viandes', 'Épices'
  image_url TEXT,
  calories_per_100g INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: USER_PROFILES (Profils utilisateurs)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  goal TEXT CHECK (goal IN ('lose', 'sport', 'cook')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: USER_FAVORITES (Favoris)
-- ============================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_recipe ON user_favorites(recipe_id);

-- ============================================
-- TABLE: USER_HISTORY (Historique)
-- ============================================
CREATE TABLE IF NOT EXISTS user_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_history_user ON user_history(user_id);

-- ============================================
-- TABLE: USER_PANTRY (Frigo)
-- ============================================
CREATE TABLE IF NOT EXISTS user_pantry (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity TEXT,
  expiry_date DATE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ingredient_id)
);

CREATE INDEX idx_user_pantry_user ON user_pantry(user_id);

-- ============================================
-- TABLE: SHOPPING_LISTS (Listes de courses)
-- ============================================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Ma liste',
  items JSONB DEFAULT '[]', -- [{"name": "Tomates", "checked": false}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FONCTION: Mise à jour automatique updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLITIQUES RLS (Row Level Security)
-- ============================================

-- Recettes: lecture publique, modification admin uniquement
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recettes visibles par tous" ON recipes
  FOR SELECT USING (true);

-- Favoris: utilisateurs voient uniquement leurs favoris
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leurs favoris" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Historique: utilisateurs voient uniquement leur historique
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leur historique" ON user_history
  FOR ALL USING (auth.uid() = user_id);

-- Frigo: utilisateurs voient uniquement leur frigo
ALTER TABLE user_pantry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leur frigo" ON user_pantry
  FOR ALL USING (auth.uid() = user_id);

-- Listes de courses: utilisateurs voient uniquement leurs listes
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs voient leurs listes" ON shopping_lists
  FOR ALL USING (auth.uid() = user_id);

-- Profils: utilisateurs voient/modifient uniquement leur profil
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs gèrent leur profil" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- ============================================
-- FIN DU SCHÉMA
-- ============================================
