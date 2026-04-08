# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CuisineConnect** — a French-language culinary companion app for pantry management and personalised recipe discovery. Built with Next.js 14 App Router, Tailwind CSS, Framer Motion, and Recharts.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build SSR app to .next/ (API routes enabled)
npm run start     # Run production build
npm run lint      # ESLint

# Database (Prisma)
npx prisma generate       # Regenerate Prisma client after schema changes
npx prisma studio         # GUI browser for the database
# ⚠️  Do NOT run `npx prisma db push` — it tries to drop the `embedding` column
#     (pgvector, managed outside Prisma). Use raw SQL for schema additions instead:
#     npx prisma db execute --stdin <<'SQL'
#       ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS my_col TEXT;
#     SQL

# Data import & enrichment
node scripts/import-themealdb.js                       # Import ~598 recipes from TheMealDB (free key "1")
node scripts/enrich-recipes.js --limit=10              # Enrich recipes with AI (Gemini 2.5-flash)
node scripts/enrich-recipes.js --dry-run               # Test enrichment without writing to DB
node scripts/import-ingredients-off.js --limit=200     # Import ingredients from OpenFoodFacts (7s delay between reqs)
node scripts/generate-synonyms.js --dry-run            # Generate ingredient synonyms for frigo matching
node scripts/generate-embeddings.js --limit=50         # Generate recipe embeddings (Gemini text-embedding-004)
node scripts/import-recipe-jsonld.js                   # Import recipes from JSON-LD structured data files
node scripts/import-spoonacular-cultural.js            # Import cultural recipes from Spoonacular API
node scripts/scrape-gemini.js                          # Scrape recipes and enrich via Gemini
```

## Architecture

### Build output
Standard Next.js SSR build — no `output: 'export'`. Builds to `.next/`. API routes, middleware, and server components all work.

### Route groups

```
src/app/
├── (dashboard)/    # Protected — layout.tsx enforces auth via auth.api.getSession()
│   │               # Wrapped in DashboardShell (AppSidebar + AppMobileNav)
│   │               # Also wraps children in LocaleProvider (i18n)
│   ├── fridge/     # Pantry management
│   ├── suggestions/# Recipe matching based on pantry
│   ├── shopping/   # Shopping list
│   ├── nutrition/  # Personal nutrition dashboard (TDEE, daily intake, history)
│   ├── profile/    # User settings / goal selection
│   ├── discover/   # All recipes — uses RecipeBrowser (communityOnly=false)
│   ├── feed/       # Community recipes — uses RecipeBrowser (communityOnly=true) + AI toggle
│   └── compare/    # Side-by-side recipe nutrition comparator (up to 3 recipes)
├── (app)/          # Pass-through layout (no auth guard, no DashboardShell)
│   ├── recipes/    # Recipe detail, create, import-url
│   └── u/          # Public user profiles (/u/[username])
├── (auth)/         # Public routes — separate centered layout
│   ├── login/
│   └── register/
├── api/            # All API routes use Prisma (not Supabase client)
└── components/     # Shared UI components (see below)
```

`AppNav.tsx` exports three components consumed by `DashboardShell`: `AppSidebar` (desktop), `AppMobileHeader`, and `AppMobileNav` (mobile bottom bar — horizontally scrollable, 8 items). Adding a new nav item: edit the `NAV_ITEMS` array in `AppNav.tsx` and add the corresponding `isActive` guard if the route requires exact matching.

### Middleware (`middleware.ts`)

Edge middleware at the project root handles session-based redirects. Protected paths: `/fridge`, `/suggestions`, `/shopping`, `/profile`, `/recipes/new`, `/recipes/import-url`. Unauthenticated requests redirect to `/login`; authenticated users visiting `/login` or `/register` redirect to `/fridge`. Uses `getSessionCookie()` from `better-auth/cookies` (no DB hit at the edge).

### Shared components (`src/app/components/`)

| Component | Purpose |
|---|---|
| `RecipeBrowser` | Infinite-scroll recipe grid with cuisine/difficulty filters and semantic search toggle. Used by `/discover` and `/feed`. |
| `RecipeCard` | Recipe thumbnail with like button, match score badge, missing ingredients. |
| `NutritionCompareChart` | Recharts `GroupedBarChart` for side-by-side nutrition comparison. Takes `CompareRecipe[]`. |
| `AppNav` | `AppSidebar`, `AppMobileHeader`, `AppMobileNav`. |
| `StoresNearby` | Geoapify nearby store lookup — embedded on recipe detail page. |
| `LanguageSwitcher` | Dropdown to switch locale (FR/EN/AR) — calls `setLocale()` server action, reloads page. |

### Database — dual-layer setup

| Layer | File | Purpose |
|---|---|---|
| Supabase JS client | `src/lib/supabase.ts` | Client-side queries, respects Row Level Security (RLS) |
| Prisma ORM | `src/lib/prisma.ts` | Type-safe access in API routes and scripts |

**Always use Prisma in API routes.** The Prisma schema at `prisma/schema.prisma` is the source of truth. `prisma.config.ts` (Prisma v7) auto-reads `DATABASE_URL`.

**Critical**: The `recipes` table has an `embedding vector(768)` column added via raw SQL for pgvector — it is intentionally absent from the Prisma schema. Running `prisma db push` will attempt to drop it (598 non-null rows). Use `prisma db execute --stdin` with targeted `ALTER TABLE` statements for any schema changes.

### i18n

Three locales supported: `fr` (default), `en`, `ar`. Locale is stored in a `locale` cookie (1-year expiry) via the `setLocale()` server action in `src/i18n/actions.ts`.

- **Server**: `getMessages(locale)` from `@/i18n/server` loads the JSON message file synchronously (no await needed).
- **Client**: `useT()` hook from `@/i18n` returns `{ t, locale }`. `t('dot.separated.key')` does a deep lookup in the message tree; returns the key itself as fallback.
- The dashboard layout reads the cookie, calls `getMessages`, and wraps children in `<LocaleProvider>`. Components outside the provider get a no-op `t` fallback.
- Message files: `src/i18n/messages/{fr,en,ar}.json`.

### Auth

`src/lib/auth.ts` configures **BetterAuth** with the Prisma adapter (email/password, Google OAuth, GitHub OAuth). Handler: `src/app/api/auth/[...all]/route.ts`. Client helper: `src/lib/auth-client.ts` — use `useSession()` in client components, `auth.api.getSession({ headers })` in server components/API routes.

### Data model key points

- `Recipe.ingredients` and `Recipe.steps` are JSONB — cast with `as RecipeIngredient[]` when reading.
- `Recipe.quality` is an AI-filled score 0–100 set during enrichment; `Recipe.enriched` flags whether enrichment has run.
- `Recipe.sourceApi` distinguishes data origin: `'themealdb'`, `'spoonacular'`, `'video'`, `'ai-generated'`, or `null` (user-created).
- `ShoppingList.items` is JSONB: `[{ "name": "Tomates", "checked": false, "category": "Légumes" }]`.
- `UserProfile` extends `User` (1:1) and includes: `goal`, `bio`, `age`, `weight`, `height`, `gender`, `activityLevel` — used by the nutrition dashboard.
- `UserRecipe` is the join table linking a `User` to a `Recipe` they authored (separate from `Recipe.authorId` string field).
- `UserFavorite` tracks saved recipes (unique per user+recipe). `UserHistory` records every recipe page view — the nutrition dashboard aggregates today's history to estimate daily intake.
- `UserPantry` has `quantity` (String) and `expiryDate` (DateTime?) fields in addition to the `ingredientId` FK.
- `Ingredient` stores per-100g macros: `caloriesPer100g`, `proteinsPer100g`, `fatsPer100g`, `carbsPer100g`. `usdaFdcId` links to USDA FoodData Central for traceability.
- `RecipeComment` has a nullable `parentId` for threaded replies.
- `IngredientSynonym` maps raw names → canonical `Ingredient` for fuzzy frigo matching.

### API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/recipes` | List recipes with filters: `cuisineType`, `category`, `tags`, `search`, `communityOnly`, pagination |
| `POST /api/recipes` | Create a recipe (auth required) |
| `GET /api/recipes/[id]` | Recipe detail |
| `PUT /api/recipes/[id]` | Update recipe (auth required) |
| `DELETE /api/recipes/[id]` | Delete recipe (auth required) |
| `POST /api/recipes/[id]/like` | Toggle like (auth required) |
| `POST /api/recipes/[id]/favorite` | Toggle favorite (auth required) |
| `GET /api/recipes/[id]/comment` | Get comments |
| `POST /api/recipes/[id]/comment` | Add comment (auth required) |
| `GET /api/recipes/[id]/nutrition` | Compute nutrition via `computeNutrition`; returns `NutritionResult` |
| `POST /api/recipes/match` | `{ pantryItems }` → ranked recipes by match score |
| `GET /api/recipes/semantic-search?q=` | Cosine similarity search via pgvector |
| `POST /api/recipes/import-url` | URL → yt-dlp → Whisper → Gemini → recipe |
| `POST /api/recipes/upload-image` | Upload image to Cloudinary |
| `GET /api/pantry` | User's pantry items (auth required) |
| `POST /api/pantry` | Add ingredient to pantry (auth required) |
| `DELETE /api/pantry/[id]` | Remove pantry item (auth required) |
| `GET /api/ingredients/search?q=` | Ingredient autocomplete |
| `GET /api/shopping-list` | User's shopping lists (auth required) |
| `POST /api/shopping-list` | Create shopping list (auth required) |
| `PUT /api/shopping-list/[id]` | Update list (items checked state etc.) |
| `DELETE /api/shopping-list/[id]` | Delete list |
| `GET /api/nutrition/daily` | Today's macro intake aggregated from `UserHistory` + TDEE targets |
| `GET /api/nutrition/history?month=YYYY-MM` | `UserHistory` entries grouped by day for the given month (auth required) |
| `GET /api/users/[id]` | Public user profile |
| `PUT /api/users/[id]` | Update profile fields including `age`, `weight`, `height`, `gender`, `activityLevel` |
| `POST /api/users/[id]/follow` | Follow/unfollow user (auth required) |
| `GET /api/favorites` | Current user's favorited recipes (auth required) |
| `GET /api/stores/nearby?lat=&lon=` | Nearby grocery stores via Geoapify |

### Nutrition utilities (`src/lib/`)

- **`nutrition.ts`** — `computeNutrition(ingredients, servings)` — async, hits DB for ingredient calories. Normalises units (g, ml, pieces, spoons, kg, cl). Falls back to synonyms for unmatched names. Returns `{ kcal, proteins, fats, carbs, perServing, matchedCount }`.
- **`tdee.ts`** — `computeTDEE(profile)` — pure function, Mifflin-St Jeor + activity multiplier. Returns `{ tdee, protein, fat, carbs, proteinKcal, fatKcal, carbsKcal }`. Returns 2000 kcal defaults if profile is incomplete.

### Semantic search (pgvector)

- `embedding vector(768)` column on `recipes` table — managed outside Prisma.
- Embeddings generated by `scripts/generate-embeddings.js` using Gemini `text-embedding-004`.
- Search: `GET /api/recipes/semantic-search?q=...` — cosine similarity via pgvector.
- Feed page has a toggle to switch between standard and AI semantic search.

### AI providers

- **Gemini 2.5-flash** (`GEMINI_API_KEY`) — recipe enrichment, synonym generation, cultural recipe generation.
- **Kimi K2.5** (`OPENROUTER_API_KEY`) — alternative enrichment provider.
- **OpenAI** (`openai` npm package) — Whisper transcription only in `POST /api/recipes/import-url`. Not a general AI provider.

### Video import pipeline

`POST /api/recipes/import-url`: URL (TikTok/Instagram/YouTube) → `yt-dlp` downloads audio → Whisper transcribes → Gemini extracts recipe JSON → saved with `sourceApi: 'video'`.

### UI conventions

- **Tailwind only** for styling — no CSS-in-JS.
- **Framer Motion** for animations; use `staggerChildren` variants for card grids. The `ease` prop in variants must be a string (`'easeOut'`) not a bezier array (TypeScript strict).
- **Recharts** (`recharts` v3) for charts — always wrap in `ResponsiveContainer`. Available: `BarChart`, `PieChart`, `Pie`, `Cell`, `Bar`, `Tooltip`, `Legend`.
- Design tokens: `brand-500` (accent, orange-red), `canvas-50/100/200` (backgrounds/borders), `stone-*` (text). Font families: `font-serif` (Lora), `font-sans` (Inter). Shadows: `shadow-card` (default), `shadow-hover` (elevated state), `shadow-float` (modals/popovers). Card pattern: `bg-white rounded-2xl border border-canvas-200 shadow-card p-5`.
- API errors always return `{ error: string }` with the appropriate HTTP status.

### Key env vars

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SPOONACULAR_API_KEY`, `GEOAPIFY_API_KEY`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`.

## Product roadmap

See `TASKS.md` for the full phased roadmap. Phases 1–5 are complete. Phase 6 (cultural cuisine data) is next:

- `scripts/import-spoonacular-cultural.js` and `scripts/scrape-gemini.js` exist; `scripts/generate-cultural-recipes.js` still to create.
- Target cuisines: Antillaise/Créole, West African, Maghrebi, Réunionnaise, Middle Eastern, Southeast Asian.
- UI cuisine filter cards (horizontal scroll, emoji/image cards, `ring-brand-500` active state) are done in `RecipeBrowser.tsx`.
- Remaining open items: OAuth callback URL configuration, embeddings still in progress, recipe import scripts for cultural cuisines.
