# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CuisineConnect** — a French-language culinary companion app for pantry management and personalised recipe discovery. Built with Next.js 14 App Router, Tailwind CSS, Framer Motion, and Recharts.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Build SSR app to .next/ (API routes enabled)
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
│   ├── fridge/     # Pantry management
│   ├── suggestions/# Recipe matching based on pantry
│   ├── shopping/   # Shopping list
│   ├── nutrition/  # Personal nutrition dashboard (TDEE, daily intake, history)
│   └── profile/    # User settings / goal selection
├── (app)/          # Pass-through layout (no auth guard, no DashboardShell)
│   ├── discover/   # All recipes — uses RecipeBrowser (communityOnly=false)
│   ├── feed/       # Community recipes — uses RecipeBrowser (communityOnly=true) + AI toggle
│   ├── compare/    # Side-by-side recipe nutrition comparator (up to 3 recipes)
│   ├── recipes/    # Recipe detail, create, import-url
│   └── u/          # Public user profiles (/u/[username])
├── (auth)/         # Public routes — separate centered layout
│   ├── login/
│   └── register/
├── api/            # All API routes use Prisma (not Supabase client)
└── components/     # Shared UI components (see below)
```

`middleware.ts` at root guards `/app/*`, `/profile/*`, `/fridge/*`, `/feed/*` as a second layer.

`AppNav.tsx` exports three components consumed by `DashboardShell`: `AppSidebar` (desktop), `AppMobileHeader`, and `AppMobileNav` (mobile bottom bar — horizontally scrollable, 8 items). Adding a new nav item: edit the `NAV_ITEMS` array in `AppNav.tsx` and add the corresponding `isActive` guard if the route requires exact matching.

### Shared components (`src/app/components/`)

| Component | Purpose |
|---|---|
| `RecipeBrowser` | Infinite-scroll recipe grid with cuisine/difficulty filters and semantic search toggle. Used by `/discover` and `/feed`. |
| `RecipeCard` | Recipe thumbnail with like button, match score badge, missing ingredients. |
| `NutritionCompareChart` | Recharts `GroupedBarChart` for side-by-side nutrition comparison. Takes `CompareRecipe[]`. |
| `AppNav` | `AppSidebar`, `AppMobileHeader`, `AppMobileNav`. |
| `StoresNearby` | Geoapify nearby store lookup — embedded on recipe detail page. |

### Database — dual-layer setup

| Layer | File | Purpose |
|---|---|---|
| Supabase JS client | `src/lib/supabase.ts` | Client-side queries, respects Row Level Security (RLS) |
| Prisma ORM | `src/lib/prisma.ts` | Type-safe access in API routes and scripts |

**Always use Prisma in API routes.** The Prisma schema at `prisma/schema.prisma` is the source of truth. `prisma.config.ts` (Prisma v7) auto-reads `DATABASE_URL`.

**Critical**: The `recipes` table has an `embedding vector(768)` column added via raw SQL for pgvector — it is intentionally absent from the Prisma schema. Running `prisma db push` will attempt to drop it (598 non-null rows). Use `prisma db execute --stdin` with targeted `ALTER TABLE` statements for any schema changes.

### Auth

`src/lib/auth.ts` configures **BetterAuth** with the Prisma adapter (email/password, Google OAuth, GitHub OAuth). Handler: `src/app/api/auth/[...all]/route.ts`. Client helper: `src/lib/auth-client.ts` — use `useSession()` in client components, `auth.api.getSession({ headers })` in server components/API routes.

### Data model key points

- `Recipe.ingredients` and `Recipe.steps` are JSONB — cast with `as RecipeIngredient[]` when reading.
- `UserProfile` extends `User` (1:1) and now includes: `goal`, `bio`, `age`, `weight`, `height`, `gender`, `activityLevel` — used by the nutrition dashboard.
- `IngredientSynonym` maps raw names → canonical `Ingredient` for fuzzy frigo matching.
- `UserHistory` records every recipe page view — the nutrition dashboard aggregates today's history to estimate daily intake.

### Nutrition utilities (`src/lib/`)

- **`nutrition.ts`** — `computeNutrition(ingredients, servings)` — async, hits DB for ingredient calories. Normalises units (g, ml, pieces, spoons, kg, cl). Falls back to synonyms for unmatched names. Returns `{ kcal, proteins, fats, carbs, perServing, matchedCount }`.
- **`tdee.ts`** — `computeTDEE(profile)` — pure function, Mifflin-St Jeor + activity multiplier. Returns `{ tdee, protein, fat, carbs, proteinKcal, fatKcal, carbsKcal }`. Returns 2000 kcal defaults if profile is incomplete.

### API endpoints (nutrition-related additions)

| Endpoint | Description |
|---|---|
| `GET /api/recipes/[id]/nutrition` | Calls `computeNutrition` for a recipe; returns `NutritionResult`. |
| `GET /api/nutrition/daily` | Auth-required. Aggregates today's `UserHistory`, computes macro sums, returns consumed + TDEE target + history entries. |
| `PUT /api/users/[id]` | Now accepts `age`, `weight`, `height`, `gender`, `activityLevel` in addition to `bio`, `goal`, `isPublic`. |

### Semantic search (pgvector)

- `embedding vector(768)` column on `recipes` table — managed outside Prisma.
- Embeddings generated by `scripts/generate-embeddings.js` using Gemini `text-embedding-004`.
- Search: `GET /api/recipes/semantic-search?q=...` — cosine similarity via pgvector.
- Feed page has a ✨ toggle to switch between standard and AI semantic search.

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
- Design tokens in use: `brand-500` (accent), `canvas-50/100/200` (backgrounds/borders), `stone-*` (text). Card pattern: `bg-white rounded-2xl border border-canvas-200 shadow-card p-5`.
- API errors always return `{ error: string }` with the appropriate HTTP status.

### Key env vars

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `SPOONACULAR_API_KEY`, `GEOAPIFY_API_KEY`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`.

## Product roadmap

See `TASKS.md` for the full phased roadmap. Phases 1–5 are complete. Phase 6 (cultural cuisine data) is next: `scripts/import-spoonacular-cultural.js` and `scripts/scrape-gemini.js` exist. Open items: OAuth callback URL configuration, remaining embeddings (~94/596 done), and cultural recipe imports (Antillaise, West African, Maghrebi, etc.).
