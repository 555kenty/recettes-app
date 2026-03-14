-- Schéma de base de données pour CuisineConnect

-- Table des utilisateurs (gérée par BetterAuth)
-- auth.users est créée automatiquement

-- Table des recettes
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  time_minutes INTEGER,
  difficulty VARCHAR(20) CHECK (difficulty IN ('Facile', 'Moyen', 'Difficile')),
  calories INTEGER,
  cuisine_type VARCHAR(100), -- 'Italien', 'Français', 'Antillais', 'Haïtien', etc.
  category VARCHAR(100), -- 'Plat principal', 'Entrée', 'Dessert', etc.
  ingredients JSONB NOT NULL, -- [{"name": "Pâtes", "quantity": "400g", "category": "Féculents"}]
  steps JSONB NOT NULL, -- [{"order": 1, "description": "Faire bouillir l'eau"}]
  tags TEXT[], -- ['Végétarien', 'Sans gluten', 'Rapide']
  source_api VARCHAR(50), -- 'spoonacular', 'themealdb', 'manual'
  source_id VARCHAR(100), -- ID dans l'API source
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des ingrédients (pour normalisation)
CREATE TABLE ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100), -- 'Légumes', 'Viandes', 'Épices'
  image_url TEXT,
  calories_per_100g INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des favoris utilisateur
CREATE TABLE user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Table de l'historique utilisateur
CREATE TABLE user_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Table des recettes créées par les utilisateurs
CREATE TABLE user_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des listes de courses
CREATE TABLE shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Ma liste',
  items JSONB NOT NULL, -- [{"name": "Tomates", "checked": false, "category": "Légumes"}]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table du frigo utilisateur
CREATE TABLE user_pantry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity VARCHAR(50),
  expiry_date DATE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, ingredient_id)
);

-- Index pour performances
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine_type);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
