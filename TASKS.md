# TASKS.md — CuisineConnect · Feuille de route complète

> Dernière mise à jour : 2026-03-14
> Ordre d'exécution : Phase 1 → 2 → 3 → 4 → 5

---

## ⚠️ À FAIRE — Refactoring UI (après Phase 2)

- [x] **Supprimer l'onboarding localStorage** dans `src/app/page.tsx` — remplacé par `useSession()` + redirect
- [x] **Supprimer les recettes hardcodées** (`RECIPES` array) — fetch `/api/recipes/match` via pantry
- [x] **Supprimer la gestion localStorage du pantry** — remplacé par `/api/pantry`
- [x] **Supprimer la gestion localStorage user/goal** — `useSession()` + `UserProfile` en DB
- [x] `GOALS`, `CATEGORIES` extraits dans des constantes

---

## PHASE 1 — Fondations techniques (bloquant tout le reste)

### 1.1 Supprimer le mode static export

> **Pourquoi urgent** : `output: 'export'` dans `next.config.js` désactive toutes les API routes. BetterAuth, Supabase mutations, tout est bloqué.

- [x] Supprimer `output: 'export'` et `distDir: 'dist'` de `next.config.js`
- [x] Garder `images: { unoptimized: true }` uniquement si pas de Cloudinary
- [x] Vérifier que `npm run build` passe sans erreur après le changement
- [x] Mettre à jour `CLAUDE.md` (la commande `build` ne génère plus dans `dist/`)

### 1.2 BetterAuth — Implémentation complète

**Contexte** : `lib/auth.ts` est configuré mais aucune route API n'existe et l'UI utilise localStorage. BetterAuth nécessite une route handler Next.js pour fonctionner.

#### 1.2.1 Route API handler

- [x] Créer `src/app/api/auth/[...all]/route.ts`
  ```ts
  import { auth } from "@/lib/auth";
  import { toNextJsHandler } from "better-auth/next-js";
  export const { GET, POST } = toNextJsHandler(auth);
  ```

#### 1.2.2 Client BetterAuth (front-end)

- [x] Créer `lib/auth-client.ts`
- [x] Ajouter `NEXT_PUBLIC_APP_URL=http://localhost:3000` dans `.env`

#### 1.2.3 Middleware de session

- [x] Créer `middleware.ts` à la racine du projet

#### 1.2.4 Pages auth

- [x] Créer `src/app/(auth)/login/page.tsx` (email + password + Google + GitHub)
- [x] Créer `src/app/(auth)/register/page.tsx`
- [x] Créer `src/app/(auth)/layout.tsx` (layout centré sans sidebar)
- [x] Ajouter les boutons OAuth dans les deux pages (Google, GitHub)
- [ ] Configurer les callback URLs OAuth dans Google Console et GitHub Apps

#### 1.2.5 Refactoring page principale

- [x] Remplacer tout le `localStorage` de `src/app/page.tsx` par `useSession()` de BetterAuth
- [x] Auth guard via `src/app/(app)/layout.tsx` (server component redirect)
- [x] `middleware.ts` redirige les non-connectés hors des pages auth

### 1.3 Prisma — Connexion à Supabase

- [x] Ajouter `DATABASE_URL` dans `.env`
- [x] `prisma.config.ts` lit `DATABASE_URL` automatiquement (Prisma v7)
- [x] Lancer `npx prisma db push` — DB déjà synchronisée
- [x] Tables vérifiées (schema déjà en place)

### 1.4 Mise à jour du schéma Prisma (features sociales)

Les champs manquants pour le réseau social :

- [x] Ajouter dans `Recipe` : `authorId`, `isPublic`, `viewCount`, `likeCount`, `language`, `videoUrl`, `servings`, `quality`, `enriched`
- [x] Créer model `RecipeComment`
- [x] Créer model `UserFollow`
- [x] Ajouter `bio`, `isPublic`, `followersCount`, `followingCount` dans `UserProfile`
- [x] Lancer `npx prisma db push` — `IngredientSynonym` appliqué en DB

---

## PHASE 2 — Pipeline de données (DB population)

### 2.1 Analyse des APIs sources

#### TheMealDB — Analyse complète

**Base URL** : `https://www.themealdb.com/api/json/v1/1/`
**Clé gratuite** : `1` (dev uniquement) | Clé prod : via abonnement PayPal
**Pas de rate limit documenté** | Pas de pagination sur les filtres

| Endpoint | Usage dans notre pipeline |
|---|---|
| `/categories.php` | Lister toutes les catégories |
| `/list.php?a=list` | Lister toutes les cuisines (27 disponibles) |
| `/list.php?i=list` | Lister tous les ingrédients |
| `/filter.php?a={area}` | Obtenir tous les repas d'une cuisine |
| `/lookup.php?i={id}` | Détail complet d'un repas |
| `/search.php?f={letter}` | Tous les repas commençant par une lettre |

**Mapping JSON TheMealDB → Notre schéma Recipe** :

```
idMeal           → sourceId
strMeal          → title
strCategory      → category
strArea          → cuisineType
strInstructions  → steps (parser en tableau par \n\n ou numéros)
strMealThumb     → imageUrl
strTags          → tags (split ",", trim)
strYoutube       → videoUrl
strIngredient1-20 + strMeasure1-20 → ingredients [{name, quantity}]
"themealdb"      → sourceApi
```

**Limites TheMealDB** :
- Max 20 ingrédients par recette (champs fixes strIngredient1-20)
- Pas de calories
- Instructions en bloc texte (à parser + enrichir par IA)
- ~300 recettes uniques en accès gratuit
- Peu de recettes Antillaises/Haïtiennes (couverture occidentale)

#### OpenFoodFacts — Analyse complète

**Base URL** : `https://world.openfoodfacts.org/api/v2/`
**Rate limits** : 100 req/min (products), 10 req/min (search), 2 req/min (facets)
**User-Agent obligatoire** : `CuisineConnect/1.0 (contact@cuisineconnect.fr)`

| Endpoint | Usage dans notre pipeline |
|---|---|
| `/api/v2/product/{barcode}` | Lookup par code-barres |
| `/api/v2/search?categories_tags=spices` | Chercher des épices |
| Bulk CSV/JSONL export | Import massif ingrédients |

**Mapping JSON OpenFoodFacts → Notre schéma Ingredient** :

```
product_name                → name
categories_tags[0]          → category
nutriments.energy-kcal_100g → caloriesPer100g
image_front_url             → imageUrl
allergens                   → (champ à ajouter au schéma)
nutriscore_grade            → (champ à ajouter au schéma)
```

**Usage recommandé pour nous** :
- Ne pas utiliser pour les recettes (pas de recettes dans OFF)
- Utiliser pour enrichir notre table `Ingredient` avec calories, allergènes, nutriscore
- Télécharger le dump JSONL plutôt que l'API (8GB compressé, 3M+ produits)
- Filtrer uniquement `categories_tags` contenant les ingrédients courants en cuisine

### 2.2 Script import TheMealDB (priorité haute — gratuit, sans clé)

- [x] Créer `scripts/import-themealdb.js` (toutes les cuisines, upsert, delay 500ms, logs)
- [x] Lancer `node scripts/import-themealdb.js` — **598 recettes importées, 0 erreurs**
- [x] Tables vérifiées (import réussi)

### 2.3 Script import Spoonacular (recettes culturelles manquantes)

- [ ] Mettre `SPOONACULAR_API_KEY` dans `.env`
- [ ] Modifier `scripts/import-recipes.js` pour utiliser le bon `DATABASE_URL`
- [ ] Ajouter gestion du rate limit : max 1 req/sec, retry avec backoff exponentiel
- [ ] Ajouter checkpoint : sauvegarder la progression dans un fichier JSON local pour reprendre si interruption
- [ ] Tester avec 5 recettes d'abord avant de lancer tout le batch

### 2.4 Import ingrédients depuis OpenFoodFacts

- [x] Créer `scripts/import-ingredients-off.js`
- [x] Utiliser la **Search API** (pas le dump de 8GB) avec categories ciblées :
  ```js
  const INGREDIENT_CATEGORIES = [
    'spices', 'herbs', 'vegetables', 'fruits', 'meats',
    'fish', 'dairy', 'cereals', 'legumes', 'oils'
  ];
  // GET /api/v2/search?categories_tags={cat}&fields=product_name,categories_tags,nutriments,image_front_url&page_size=50
  ```
- [x] Ajouter header `User-Agent: CuisineConnect/1.0 (contact@cuisineconnect.fr)`
- [x] Respecter rate limit : 10 req/min max pour la search → delay 7s entre requêtes
- [x] Upsert dans table `Ingredient` avec `name` comme clé unique

### 2.5 Script d'enrichissement IA (Claude API)

> Cette étape transforme des recettes incomplètes en recettes de qualité professionnelle.

- [x] Créer `scripts/enrich-recipes.js` (batch 5, provider Gemini 2.5-flash, dry-run, --limit, error logging)
- [x] Lancer `node scripts/enrich-recipes.js --limit=3 --dry-run` — test OK
- [~] Lancer `node scripts/enrich-recipes.js --limit=600` — **EN COURS** (PID 569652, ~242/598 enrichies)

### 2.6 Normalisation des ingrédients (matching frigo → recettes)

> Problème clé : "tomates cerises" ≠ "tomate" dans une recherche exacte. Il faut une table de synonymes.

- [x] Créer model `IngredientSynonym` dans Prisma (appliqué en DB via `npx prisma db push`)
- [x] Créer `scripts/generate-synonyms.js` : utiliser Gemini/Kimi pour générer des synonymes courants pour chaque ingrédient de la DB
- [x] Implémenter la fonction de matching `findMatchingRecipes(pantryItems)` :
  ```ts
  // Algorithme de matching
  // 1. Récupérer les noms canoniques des ingrédients du frigo
  // 2. Pour chaque recette, calculer : matchScore = matched / total_ingredients
  // 3. Trier par matchScore DESC, filtrer ceux > 0.5
  // 4. Retourner avec les ingrédients manquants pour compléter
  ```

---

## PHASE 3 — API interne & Routes

### 3.1 Architecture API Next.js

Structure des routes API à créer dans `src/app/api/` :

```
api/
├── auth/[...all]/route.ts          ← BetterAuth (Phase 1)
├── recipes/
│   ├── route.ts                    ← GET (liste) + POST (créer)
│   ├── [id]/route.ts               ← GET, PUT, DELETE
│   ├── [id]/favorite/route.ts      ← POST/DELETE toggle favori
│   ├── [id]/like/route.ts          ← POST/DELETE toggle like
│   └── match/route.ts              ← POST {pantryItems} → recettes matchées
├── pantry/
│   ├── route.ts                    ← GET + POST ajouter ingrédient
│   └── [id]/route.ts               ← DELETE
├── shopping-list/
│   ├── route.ts                    ← GET + POST
│   └── [id]/route.ts               ← PUT, DELETE
├── users/
│   ├── [id]/route.ts               ← Profil public
│   └── [id]/follow/route.ts        ← POST/DELETE follow
└── ingredients/
    └── search/route.ts             ← GET search (autocomplete frigo)
```

- [x] Créer `src/app/api/recipes/route.ts` (GET avec filtres : cuisineType, category, tags, search)
- [x] Créer `src/app/api/recipes/[id]/route.ts` (GET + PUT + DELETE)
- [x] Créer `src/app/api/recipes/[id]/favorite/route.ts` (POST/DELETE toggle)
- [x] Créer `src/app/api/recipes/match/route.ts` (POST {pantryItems} → matchScore)
- [x] Créer `src/app/api/pantry/route.ts` (GET + POST)
- [x] Créer `src/app/api/pantry/[id]/route.ts` (DELETE)
- [x] Créer `src/app/api/ingredients/search/route.ts` (autocomplete)
- [x] Créer `src/app/api/shopping-list/route.ts` (GET + POST)
- [x] Créer `src/app/api/shopping-list/[id]/route.ts` (PUT + DELETE)
- [x] Créer `src/app/api/users/[id]/route.ts` (GET profil public + PUT update)
- [x] Créer `src/app/api/users/[id]/follow/route.ts` (POST/DELETE follow)

### 3.2 Refactoring UI — Connexion à l'API réelle

- [x] Remplacer les `RECIPES` hardcodés dans `page.tsx` par un fetch `/api/recipes` (avec recherche temps réel)
- [x] Remplacer la gestion `localStorage` du pantry par des appels `/api/pantry`
- [x] Remplacer la gestion `localStorage` de la shopping list par `/api/shopping-list`
- [x] Implémenter le bouton favori (cœur) avec appel `/api/recipes/[id]/favorite`
- [x] Remplacer onboarding localStorage par `useSession()` + sélection objectif via `/api/users/[id]`
- [x] Implémenter l'onglet "Suggestions" basé sur `/api/recipes/match` (badge compteur, ajout courses)

---

## PHASE 4 — Features sociales

### 4.1 Feed public de recettes

- [x] Page `src/app/(app)/feed/page.tsx` : flux de recettes récentes/populaires
- [x] Système de filtres : par cuisine, catégorie, difficulté
- [x] Infinite scroll (IntersectionObserver)
- [x] Composant `RecipeCard` réutilisable (`src/app/components/RecipeCard.tsx`)

### 4.2 Profils utilisateurs publics

- [x] Page `src/app/(app)/u/[username]/page.tsx`
- [x] Afficher : bio, goal, followers/following, date membre
- [x] Bouton Follow/Unfollow avec compteur live

### 4.3 Commentaires et interactions

- [x] `src/app/api/recipes/[id]/comment/route.ts` (GET/POST/DELETE)
- [x] `src/app/api/recipes/[id]/like/route.ts` (POST/DELETE, compteur public)
- [x] Section commentaires dans la page détail recette
- [x] Étapes cochables (clic pour marquer comme faite)
- [ ] Notifications in-app (new follower, new comment) — Phase 5

### 4.4 Soumission de recettes par les utilisateurs

- [x] Page `src/app/(app)/recipes/new/page.tsx` : formulaire complet
- [x] Ingrédients dynamiques (ajouter/supprimer)
- [x] Étapes dynamiques (ajouter/supprimer)
- [x] Toggle public/privé
- [x] `POST /api/recipes` pour la création
- [x] Page détail recette `src/app/(app)/recipes/[id]/page.tsx`
- [x] Upload image via Cloudinary (`POST /api/recipes/upload-image`) + preview dans le formulaire

---

## PHASE 5 — Features avancées

### 5.1 Trouver les magasins et épices proches

- [x] Ajouter `GEOAPIFY_API_KEY` dans `.env`
- [x] Créer `src/app/api/stores/nearby/route.ts` (GET lat/lon/radius → supermarchés Geoapify)
- [x] UI : composant "Trouver en magasin" sur la page détail recette (`StoresNearby` intégré)
- [ ] Pour les prix : model `IngredientPrice` + crowdsourcing — Phase suivante

### 5.2 Pipeline vidéo (TikTok/Reels → Recette)

> Feature avancée — à implémenter après les phases 1-4

- [x] Endpoint `POST /api/recipes/import-url` qui accepte une URL (TikTok, Instagram, YouTube)
- [x] Utiliser `yt-dlp` (outil CLI) pour télécharger la vidéo côté serveur
- [x] Extraire l'audio → transcrire avec Whisper API (OpenAI) ou AssemblyAI
- [x] Envoyer la transcription à l'IA (Gemini/Kimi) pour extraction en JSON
- [x] Sauvegarder la recette extraite avec `sourceApi: 'video'` et `videoUrl` rempli

### 5.3 IA de recherche sémantique

- [x] `pgvector` activé dans Supabase + colonne `embedding vector(768)` ajoutée sur `recipes`
- [x] Script `scripts/generate-embeddings.js` — génère les embeddings via Gemini text-embedding-004
- [x] Route `GET /api/recipes/semantic-search?q=` — recherche cosine similarity via pgvector
- [x] Toggle IA dans le feed (`/feed`) — bouton ✨ pour passer en mode recherche sémantique
- [~] Lancer `node scripts/generate-embeddings.js` — **EN COURS** (PID 657436, 768-dim via gemini-embedding-001)

---

## Référence rapide — Variables d'environnement requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=                    # min 32 caractères, générer avec: openssl rand -base64 32

# OAuth (optionnel mais recommandé)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# APIs recettes
SPOONACULAR_API_KEY=                   # 150 req/jour gratuit
# TheMealDB : clé "1" pour dev, abonnement PayPal pour prod

# IA
ANTHROPIC_API_KEY=                     # Pour enrichissement recettes

# Images
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Localisation magasins
GEOAPIFY_API_KEY=                      # 3000 req/jour gratuit sur geoapify.com
```

---

## Ordre de priorité absolu

```
[x] 1.  Supprimer output: 'export'             ← FAIT
[x] 2.  BetterAuth route + client              ← FAIT
[x] 3.  Pages login / register                 ← FAIT
[x] 4.  Middleware auth + protection routes    ← FAIT
[x] 5.  Prisma DATABASE_URL + db push          ← FAIT
[x] 6.  Script import TheMealDB                ← FAIT (598 recettes)
[~] 7.  Script enrichissement IA               ← EN COURS (Gemini 2.5-flash)
[x] 8.  Routes API recipes + pantry            ← FAIT (11 routes)
[x] 9.  Brancher l'UI sur l'API réelle         ← FAIT (useSession + API calls)
[x] 10. Features sociales                      ← FAIT (feed, profils, likes, commentaires, création recette)
[x] 11. StoresNearby sur page recette          ← FAIT (Geoapify)
[x] 12. Import vidéo → recette                 ← FAIT (yt-dlp + Whisper + Gemini)
[x] 13. Import ingrédients OpenFoodFacts       ← FAIT (194 ingrédients importés)
[x] 14. Synonymes ingrédients                  ← FAIT (876 synonymes, matching amélioré)
[x] 15. Recherche sémantique pgvector          ← FAIT (embeddings 768-dim, route + toggle feed)
[~] 16. Génération embeddings                  ← EN COURS (94+/596 recettes)
```

---

## Bonnes pratiques

- **Toujours** inclure le header `User-Agent: CuisineConnect/1.0 (contact@monsite.fr)` dans les requêtes vers OpenFoodFacts
- **Toujours** ajouter un délai entre les requêtes aux APIs externes (500ms minimum, 1s recommandé)
- **Ne jamais** stocker de session ou donnée sensible dans `localStorage` — utiliser les cookies BetterAuth
- **Upsert** plutôt qu'insert pour les imports (basé sur `sourceId`) pour éviter les doublons
- **Enrichir par batch** de 10 recettes max pour éviter les timeouts Claude API
- Le champ `enriched: boolean` permet de reprendre le pipeline où il s'est arrêté
- Pour les recettes Antillaises/Haïtiennes : TheMealDB n'en a pas → passer par Spoonacular ou création manuelle
