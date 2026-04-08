# CuisineConnect — Document de Synthèse PFA

**EPITA — Projet de Fin d'Apprentissage 2026**
**Équipe** : Quentin ARBAUT · Rayan MOUSSA · Christian AZIAKA
**Date de soutenance** : 09 avril 2026

---

## 1. Présentation du projet

### 1.1 Contexte et problématique

Manger sainement reste un défi quotidien pour une grande partie de la population urbaine. Les causes sont bien identifiées : manque de temps, méconnaissance des apports nutritionnels, et surtout le fossé entre les ingrédients disponibles dans le frigo et les recettes que l'on sait cuisiner. Les applications culinaires existantes traitent ces dimensions de manière cloisonnée.

**Marmiton** propose un catalogue de recettes françaises immense, mais sans lien avec les ingrédients réellement disponibles chez l'utilisateur ni avec ses objectifs nutritionnels. **Yummly** (racheté par Whirlpool) offre des fonctionnalités de filtrage nutritionnel, mais reste centré sur les cuisines anglophones et repose sur un modèle freemium restrictif. **MyFitnessPal** aborde la nutrition de manière sérieuse, mais se cantonne au suivi calorique sans jamais proposer de recettes contextualisées.

Aucune de ces solutions ne croise simultanément trois dimensions pourtant complémentaires :
1. **L'anti-gaspillage** : utiliser ce qu'on a déjà dans son frigo
2. **La nutrition sérieuse** : respecter des objectifs macro-nutritionnels personnalisés (TDEE, protéines, lipides, glucides)
3. **La diversité culinaire** : explorer des cuisines du monde entier, y compris les cuisines africaines, antillaises et maghrébines souvent absentes des bases de données grand public

**CuisineConnect** se positionne à cette intersection. La problématique centrale du projet est la suivante :

> Comment permettre à un utilisateur de manger sainement, en utilisant les ingrédients disponibles dans son frigo, en accord avec ses objectifs nutritionnels personnels, tout en lui faisant découvrir des cuisines du monde entier ?

Du point de vue du cadre PFA, ce projet relève d'une double approche : **Data Visualisation** (croisement de datasets hétérogènes, identification de corrélations, représentation graphique des données nutritionnelles) et **Ingénierie** (conception et déploiement d'un POC fonctionnel full-stack avec pipeline de données, APIs externes, et recherche vectorielle).

### 1.2 Objectifs

**Objectif principal** : concevoir et déployer un POC (Proof of Concept) d'une application web qui personnalise les suggestions de recettes selon deux paramètres croisés — le contenu du frigo de l'utilisateur ET ses objectifs macro-nutritionnels.

**Objectifs secondaires** :
- Démontrer la faisabilité d'un moteur de recherche sémantique IA appliqué à un corpus culinaire, via des embeddings vectoriels (768 dimensions, pgvector)
- Mettre en évidence la corrélation entre le contenu d'un frigo typique et le taux de couverture des objectifs nutritionnels journaliers
- Construire une base de données culinaire multiculturelle en croisant plusieurs sources de données (TheMealDB, USDA FoodData Central, OpenFoodFacts, Spoonacular)
- Implémenter un pipeline de génération de données via IA pour pallier les lacunes des datasets libres sur les cuisines africaines, antillaises et maghrébines

### 1.3 Cible utilisateur

La cible principale de CuisineConnect est un profil urbain, âgé de 25 à 40 ans, sensible à sa santé sans être un sportif de haut niveau. Il s'agit d'un utilisateur à l'aise avec les outils numériques, qui cuisine régulièrement mais manque de temps pour planifier ses repas, et qui souhaite manger varié sans sacrifier ses objectifs nutritionnels. Une attention particulière a été portée aux utilisateurs issus de la diaspora africaine et antillaise, pour qui les applications existantes ne proposent quasiment aucune recette de leur patrimoine culinaire.

---

## 2. Datasets et corrélations

### 2.1 Sources de données utilisées

| Source | Type | Volume | Usage |
|---|---|---|---|
| TheMealDB API | Recettes structurées | 598 recettes, 27 cuisines | Base de recettes principale (clé publique gratuite `1`) |
| USDA FoodData Central | Données nutritionnelles | Base complète, >300 000 aliments | Calcul des macros exacts (protéines, lipides, glucides) par ingrédient |
| OpenFoodFacts | Produits alimentaires | 194 ingrédients importés | Enrichissement des données nutritionnelles (calories/100g, nutriscore) |
| Spoonacular API | Recettes culturelles | 150 req/jour (free tier) | Recettes africaines, caribéennes, moyen-orientales absentes de TheMealDB |
| Geoapify | Géolocalisation | 3 000 req/jour gratuit | Magasins d'alimentation à proximité de l'utilisateur |

**TheMealDB** est la source primaire. L'API publique (clé `1`) expose 27 cuisines, soit 598 recettes structurées avec ingrédients (jusqu'à 20 par recette), instructions, images et vidéos YouTube associées. La principale limite est la couverture géographique très occidentale : les cuisines africaines de l'Ouest, antillaises et maghrébines y sont quasi absentes. Les données nutritionnelles sont également manquantes — elles ont été enrichies via USDA.

**USDA FoodData Central** fournit des données nutritionnelles de référence (calories, protéines, lipides, glucides pour 100g) pour chaque ingrédient. L'API est publique et gratuite, mais limitée à 1 000 requêtes par heure. L'identifiant `usdaFdcId` est persisté dans la table `Ingredient` pour éviter de re-requêter l'API à chaque calcul.

**OpenFoodFacts** complète la couverture nutritionnelle sur les ingrédients transformés et les produits de grande consommation. L'import a été réalisé via la Search API en ciblant 10 catégories d'ingrédients courants (épices, légumes, fruits, viandes, poissons, laitages, céréales, légumineuses, huiles, herbes).

### 2.2 Corrélations identifiées

La corrélation centrale du projet est **le croisement du frigo utilisateur avec la composition en ingrédients des recettes**.

Le frigo de l'utilisateur constitue un dataset dynamique : chaque item de la table `UserPantry` représente un ingrédient disponible chez lui. Les recettes de la base constituent un dataset statique dont chaque entrée contient une liste d'ingrédients normalisés. Le **score de match** est calculé comme suit :

```
matchScore = nombre_ingrédients_matchés / total_ingrédients_recette
```

Les recettes sont triées par ce score décroissant. Seules celles avec un score supérieur à 0 sont remontées, les ingrédients manquants étant listés pour faciliter la création d'une liste de courses.

La deuxième corrélation est **nutritionnelle** : les macros calculés pour une recette (via USDA) sont comparés aux besoins journaliers de l'utilisateur calculés par la formule de Mifflin-St Jeor (TDEE). Cette comparaison permet de recommander les recettes les plus adaptées à l'objectif de l'utilisateur (perte de poids, sport, ou cuisine plaisir).

Une troisième corrélation, plus exploratoire, émerge de la recherche sémantique : les embeddings vectoriels (768 dimensions, modèle Gemini `text-embedding-004`) capturent des similarités sémantiques entre recettes qui transcendent les mots-clés exacts — une recherche pour "plat léger été" peut ainsi remonter une salade thaïlandaise même si le terme "léger" n'apparaît pas dans la description.

### 2.3 Problème central : normalisation des ingrédients

La normalisation des noms d'ingrédients est le problème le plus critique du projet. Sans normalisation, "tomates cerises", "tomate", "tomates pelées" et "cherry tomatoes" sont quatre entrées distinctes dans la base de données. Un frigo contenant "tomates" ne matcherait donc aucune recette mentionnant "cherry tomatoes".

Pour résoudre ce problème, une table `IngredientSynonym` a été créée : elle mappe 876 variantes de noms vers un ingrédient canonique de la base. Ces synonymes ont été générés automatiquement par Gemini 2.5-flash à partir de chaque ingrédient canonique, en tenant compte des variantes linguistiques (français/anglais), des formes déclinées (pluriel, adjectivé) et des appellations régionales.

L'algorithme de matching consulte d'abord le nom canonique, puis parcourt la table de synonymes en cas d'échec. Ce mécanisme a permis d'élever le taux de match entre frigo et recettes de moins de 20% (matching exact) à plus de 60% (matching avec synonymes).

---

## 3. Architecture technique

### 3.1 Choix du framework : Next.js 14 App Router

Le projet est construit sur **Next.js 14** (version `^14.2.35`) avec l'App Router, en TypeScript 5.

**Pourquoi Next.js 14 et non React seul, Vue ou Nuxt ?**

L'App Router de Next.js 14 offre des Server Components natifs qui permettent de réduire le JavaScript envoyé au client et d'exécuter des requêtes base de données directement dans les composants serveur. Le routing imbriqué avec `layout.tsx` facilite la gestion de l'authentification (le layout du groupe `(dashboard)` vérifie la session et redirige si nécessaire, sans duplication de code). Les API Routes intégrées éliminent le besoin d'un backend Express séparé — l'ensemble de la logique serveur vit dans le même dépôt, avec les mêmes types TypeScript partagés.

Le middleware Edge (`middleware.ts`) permet de protéger les routes sans faire de requête base de données à chaque hit, en lisant uniquement le cookie de session via `getSessionCookie()` de BetterAuth.

**Alternative écartée** : une architecture Express + React SPA aurait nécessité deux dépôts, deux serveurs, une configuration CORS, et une duplication des types entre frontend et backend — une complexité opérationnelle injustifiée pour un POC.

**Alternative Vue/Nuxt** : écartée par choix d'écosystème (TypeScript plus mature dans Next.js, plus grande communauté pour les bibliothèques utilisées comme Recharts, Framer Motion).

### 3.2 Base de données : PostgreSQL / Supabase + Prisma

La base de données est un **PostgreSQL** hébergé sur **Supabase** (managed, plan gratuit), avec deux couches d'accès :

- **Supabase JS Client** (`@supabase/supabase-js ^2.99.1`) pour les requêtes côté client, avec respect du Row Level Security (RLS)
- **Prisma ORM** (`prisma ^7.5.0`, `@prisma/client ^7.5.0`) pour toutes les API routes et scripts, avec le driver natif `@prisma/adapter-pg`

**Pourquoi PostgreSQL et non MongoDB ou Firebase ?**

Le modèle de données est fondamentalement relationnel : les recettes sont liées à des utilisateurs (auteur, favoris, historique), les ingrédients sont liés aux recettes via JSONB et aux utilisateurs via la table `UserPantry`, les synonymes sont liés aux ingrédients. Un store documentaire comme MongoDB aurait nécessité de dénormaliser agressivement ou de recréer la logique relationnelle manuellement.

Le facteur décisif est **pgvector** : cette extension PostgreSQL permet le stockage et la recherche par similarité cosinus de vecteurs directement en SQL (`1 - (embedding <=> query_embedding)`). Cette approche intègre la recherche sémantique dans la même base de données, sans service vectoriel externe (Pinecone ou Weaviate auraient introduit un service supplémentaire à gérer et à facturer).

**Difficulté rencontrée** : la colonne `embedding vector(768)` ajoutée via SQL brut pour pgvector ne peut pas être déclarée dans le schéma Prisma — Prisma ne supporte pas le type `vector`. Toute exécution de `prisma db push` détecte cette colonne comme inconnue et propose de la supprimer, ce qui détruirait les 598 embeddings générés. La solution retenue est de gérer cette colonne exclusivement en dehors du schéma Prisma, via des commandes `prisma db execute --stdin` avec des `ALTER TABLE` ciblés.

### 3.3 Authentification : BetterAuth

L'authentification est gérée par **BetterAuth** (`better-auth ^1.5.5`) avec l'adaptateur Prisma (`@better-auth/prisma-adapter ^1.5.5`).

**Pourquoi BetterAuth et non NextAuth.js, Clerk ou Supabase Auth ?**

- **NextAuth v5 (Auth.js)** : en version bêta instable au moment du choix, avec des breaking changes fréquents et une documentation incomplète pour l'App Router
- **Clerk** : payant au-delà du free tier, fort lock-in vendor, intégration complexe avec un schéma Prisma personnalisé
- **Supabase Auth** : bien intégré à l'écosystème Supabase mais couplé au client JavaScript Supabase — difficile à mixer avec Prisma dans les API routes sans duplication de la logique d'authentification
- **BetterAuth** : open-source, adaptateur Prisma natif, support email/password + OAuth Google + OAuth GitHub, sessions basées sur cookies, et surtout le helper `getSessionCookie()` qui permet au middleware Edge de vérifier l'authentification sans hit base de données

### 3.4 Intelligence Artificielle : Gemini + pgvector

**Trois usages distincts de l'IA dans le projet** :

**1. Enrichissement de recettes** (`scripts/enrich-recipes.js`)
Le modèle **Gemini 2.5-flash** (`models/gemini-2.5-flash`, via l'API Google Generative Language) enrichit chaque recette importée depuis TheMealDB avec une description narrative, des tags normalisés, un score de qualité de 0 à 100, et une normalisation des étapes de préparation. Le script traite des batches de 5 recettes, supporte un mode `--dry-run`, et enregistre le flag `enriched: true` sur chaque recette traitée pour permettre la reprise du pipeline.

**2. Génération de synonymes** (`scripts/generate-synonyms.js`)
Le même modèle génère les 876 synonymes d'ingrédients en produisant, pour chaque ingrédient canonique, une liste de variantes (pluriel, adjectivé, anglais, marques génériques, appellations régionales).

**3. Embeddings et recherche sémantique** (`scripts/generate-embeddings.js`, `GET /api/recipes/semantic-search`)
Le modèle **Gemini `text-embedding-004`** génère des vecteurs de 768 dimensions pour chaque recette (titre + description + tags + ingrédients). Ces vecteurs sont stockés dans la colonne `embedding vector(768)` de la table `recipes`. La recherche sémantique exécute une similarité cosinus en SQL via pgvector, permettant des requêtes en langage naturel ("plat réconfortant hivernal", "recette rapide protéinée") qui transcendent la correspondance par mots-clés.

**4. Import vidéo** (`POST /api/recipes/import-url`)
Pipeline complet : une URL TikTok, Instagram ou YouTube est téléchargée par `yt-dlp`, l'audio est extrait et transcrit par l'API **OpenAI Whisper** (`openai ^6.29.0`), puis Gemini extrait un JSON structuré (titre, ingrédients, étapes, temps) depuis la transcription. La recette est sauvegardée avec `sourceApi: 'video'`.

Un provider alternatif **Kimi K2.5** (via OpenRouter, `moonshotai/kimi-k2.5`) est disponible pour l'enrichissement via le flag `--provider=kimi-k2`.

### 3.5 Calcul nutritionnel

Deux fonctions pures constituent le noyau du moteur nutritionnel (`src/lib/nutrition.ts` et `src/lib/tdee.ts`) :

**`computeTDEE(profile)`** — Calcule le besoin énergétique journalier total selon la formule de Mifflin-St Jeor :
- Homme : `BMR = (10 × poids_kg) + (6,25 × taille_cm) - (5 × âge) + 5`
- Femme : `BMR = (10 × poids_kg) + (6,25 × taille_cm) - (5 × âge) - 161`
- TDEE = BMR × multiplicateur d'activité (sédentaire ×1,2 ; léger ×1,375 ; modéré ×1,55 ; actif ×1,725 ; très actif ×1,9)

Les macros cibles sont ensuite calculées selon l'objectif de l'utilisateur :
- **Perte de poids** (`lose`) : 35% protéines / 25% lipides / 40% glucides
- **Sport** (`sport`) : 30% protéines / 25% lipides / 45% glucides
- **Cuisine plaisir** (`cook`) : 20% protéines / 30% lipides / 50% glucides

**`computeNutrition(ingredients, servings)`** — Calcule les macros totaux d'une recette. Pour chaque ingrédient, la fonction normalise la quantité dans l'unité de référence (g, ml, pièces, cuillères à soupe/café, kg, cl), interroge la base USDA via la table `Ingredient`, et se rabat sur une table de lookup hardcodée de 120 ingrédients courants en cas d'absence en DB. La fonction retourne `{ kcal, proteins, fats, carbs, perServing, matchedCount }`.

### 3.6 Interface utilisateur

L'interface est construite avec **Tailwind CSS** (`^3.4.19`) pour le styling, **Framer Motion** (`^12.36.0`) pour les animations (grilles de cards avec `staggerChildren`), et **Recharts** (`^3.8.0`) pour les graphiques nutritionnels (`BarChart`, `PieChart` dans `NutritionCompareChart`).

La navigation est gérée par un composant `AppNav` exportant trois sous-composants : `AppSidebar` (desktop, latérale), `AppMobileHeader` (bandeau mobile), et `AppMobileNav` (barre de navigation mobile horizontalement scrollable, 8 items).

L'internationalisation supporte trois locales : **français** (défaut), **anglais** et **arabe**. Le locale est stocké dans un cookie d'un an, lu par le layout dashboard via `getMessages()` et exposé aux composants client via le hook `useT()`.

---

## 4. Fonctionnalités clés

### 4.1 Gestion du frigo (Pantry)

L'utilisateur renseigne les ingrédients disponibles chez lui via un champ d'autocomplétion qui interroge `GET /api/ingredients/search`. L'autocomplétion est alimentée par les 194 ingrédients importés depuis OpenFoodFacts, enrichis des données USDA. Chaque item de pantry peut comporter une quantité et une date de péremption (`expiryDate`). La table `UserPantry` impose une contrainte d'unicité `(userId, ingredientId)` pour éviter les doublons.

### 4.2 Matching recettes ↔ frigo

Le endpoint `POST /api/recipes/match` reçoit la liste des items du frigo et retourne les recettes triées par score de match décroissant. Pour chaque recette, les ingrédients manquants sont identifiés et peuvent être ajoutés en un clic à une liste de courses (`ShoppingList`). Le score de match est affiché sous forme de badge coloré sur chaque `RecipeCard`.

### 4.3 Dashboard nutritionnel

La page `/nutrition` agrège l'historique de consommation de la journée (table `UserHistory`, chaque vue de recette étant enregistrée) et compare les macros cumulés aux cibles TDEE personnalisées. Un graphique Recharts en barres groupées visualise l'avancement sur les protéines, lipides et glucides. L'endpoint `GET /api/nutrition/daily` calcule en temps réel le bilan du jour.

### 4.4 Recherche sémantique IA

Sur la page `/feed`, un bouton toggle permet de passer du mode de recherche standard (filtres textuels par cuisine, catégorie, difficulté) au mode **recherche sémantique IA** (`GET /api/recipes/semantic-search?q=`). En mode IA, la requête de l'utilisateur est convertie en vecteur 768-dim par Gemini `text-embedding-004`, et les recettes sont classées par similarité cosinus via pgvector. Ce mode permet des recherches en langage naturel.

### 4.5 Import de recettes depuis vidéo

La page `/recipes/import-url` permet d'importer une recette depuis une URL TikTok, Instagram ou YouTube. Le pipeline complet (téléchargement `yt-dlp` → transcription Whisper → extraction Gemini → sauvegarde) s'exécute en quelques dizaines de secondes. La recette est sauvegardée avec `sourceApi: 'video'` et le `videoUrl` d'origine.

### 4.6 Réseau social culinaire

L'application dispose d'un feed social (`/feed`) avec scroll infini, un système de likes et commentaires sur chaque recette, des profils utilisateurs publics (`/u/[username]`) avec bio, objectif et compteurs de followers/following, et la possibilité de créer et partager ses propres recettes (formulaire complet avec upload d'image via Cloudinary).

---

## 5. Difficultés rencontrées et solutions

### 5.1 Normalisation des ingrédients

**Problème** : le matching frigo-recette initial retournait moins de 20% de correspondances en raison de la variété des appellations pour un même ingrédient ("tomates cerises", "tomate", "cherry tomatoes", "tomates pelées").

**Solution** : génération via Gemini d'une table `IngredientSynonym` de 876 entrées. Le matching consulte d'abord le nom exact, puis les synonymes. Le taux de match est passé à plus de 60%.

### 5.2 Colonne pgvector non gérée par Prisma

**Problème** : Prisma 7 ne supporte pas nativement le type `vector` de pgvector. La colonne `embedding vector(768)`, ajoutée en SQL brut sur la table `recipes`, est détectée par `prisma db push` comme une colonne inconnue à supprimer — ce qui détruirait les 598 embeddings en production.

**Solution** : la colonne est exclue du schéma Prisma et gérée exclusivement en dehors de l'ORM. Toute migration sur cette colonne s'effectue via `prisma db execute --stdin` avec des instructions SQL ciblées. Cette contrainte est documentée dans `CLAUDE.md` pour éviter toute régression.

### 5.3 Migration du mode static export vers SSR

**Problème** : le projet était initialement configuré avec `output: 'export'` dans `next.config.js`, ce qui désactive toutes les API routes Next.js. BetterAuth, les mutations Supabase et toute la logique serveur étaient donc inutilisables.

**Solution** : suppression de `output: 'export'` et `distDir: 'dist'` de `next.config.js`, migration vers un SSR complet. Reconstruction complète de l'architecture d'authentification (middleware Edge, sessions cookie) et de toutes les API routes.

### 5.4 Couverture insuffisante des cuisines africaines et antillaises

**Problème** : TheMealDB, principale source de données libre, a une couverture très occidentale. Sur 27 cuisines, les cuisines africaines de l'Ouest, antillaises (Martinique, Guadeloupe, Haïti) et réunionnaises sont quasi absentes — un angle mort qui va à l'encontre de la promesse de diversité culinaire du projet.

**Solution** : trois approches complémentaires ont été initiées. L'import via Spoonacular (`scripts/import-spoonacular-cultural.js`) cible les cuisines "African", "Caribbean" et "Middle Eastern". La génération IA directe via Gemini 2.5-flash (`scripts/scrape-gemini.js`) permet de créer des recettes authentiques sans dépendance externe. L'import depuis des vidéos YouTube culinaires permet d'extraire des recettes de créateurs de contenu de la diaspora. La Phase 6 du roadmap prévoit 200 à 300 recettes supplémentaires issues de ces cuisines.

### 5.5 Gestion des rate limits des APIs externes

**Problème** : USDA FoodData Central est limité à 1 000 requêtes par heure, OpenFoodFacts à 100 requêtes par minute (search API), Spoonacular à 150 requêtes par jour sur le plan gratuit.

**Solution** : délais entre requêtes (500ms minimum sur TheMealDB, 7 secondes sur OpenFoodFacts), retry avec backoff exponentiel sur les erreurs 429, et persistance de l'identifiant `usdaFdcId` dans la table `Ingredient` pour ne jamais re-requêter les données déjà récupérées.

---

## 6. Résultats et métriques

À la date de soutenance, le projet CuisineConnect présente les métriques suivantes :

| Métrique | Valeur |
|---|---|
| Recettes importées | 598 (27 cuisines, source TheMealDB) |
| Ingrédients avec données nutritionnelles | 194 (source OpenFoodFacts + USDA) |
| Synonymes d'ingrédients générés | 876 (source Gemini 2.5-flash) |
| Embeddings générés | ~94 / 596 recettes (en cours, ~16%) |
| APIs externes intégrées | 5 (TheMealDB, USDA FoodData Central, OpenFoodFacts, Spoonacular, Geoapify) |
| Providers IA utilisés | 3 (Gemini 2.5-flash, OpenRouter/Kimi K2.5, OpenAI Whisper) |
| Routes API Next.js | 20+ endpoints (recettes, pantry, nutrition, utilisateurs, suggestions, import vidéo) |
| Locales supportées | 3 (français, anglais, arabe) |
| Infrastructure | Application déployée sur Vercel, base PostgreSQL sur Supabase (managed) |

Les 5 phases du roadmap initial sont complètes :
- Phase 1 : fondations techniques (SSR, BetterAuth, Prisma)
- Phase 2 : pipeline de données (import TheMealDB, OpenFoodFacts, enrichissement IA)
- Phase 3 : API interne et connexion UI
- Phase 4 : fonctionnalités sociales (feed, profils, likes, commentaires, création recette)
- Phase 5 : fonctionnalités avancées (import vidéo, recherche sémantique, géolocalisation magasins)

La Phase 6 (diversification culinaire : Antillaise, Africaine de l'Ouest, Maghrébine, Réunionnaise) est en cours d'initialisation.

---

## 7. Perspectives d'évolution

**Court terme (1 à 3 mois)** :
- Compléter les embeddings vectoriels pour les 502 recettes restantes (~84% de la base), ce qui permettra de tirer pleinement parti de la recherche sémantique IA
- Générer 200 à 300 recettes pour les cuisines sous-représentées (Antillaise/Créole, Africaine de l'Ouest, Réunionnaise, Maghrébine) via `scripts/generate-cultural-recipes.js` à créer
- Configurer les callback URLs OAuth en production (Google Console, GitHub Apps)

**Moyen terme (3 à 6 mois)** :
- Intégrer un module de **prix des ingrédients** par crowdsourcing (modèle `IngredientPrice`), permettant d'optimiser les suggestions non seulement sur les critères nutritionnels et de frigo, mais aussi sur un budget alimentaire hebdomadaire
- Développer une **application mobile native** (React Native / Expo) pour rendre la gestion du frigo plus pratique au quotidien (scan de codes-barres, notifications push)

**Long terme** :
- Analyse des **tendances saisonnières** : en agrégeant les données de pantry de la communauté, il devient possible de corréler la disponibilité des ingrédients avec les saisons et les tendances culinaires
- **Planificateur de repas hebdomadaire** : génération automatique d'un menu équilibré sur 7 jours, optimisé sur le TDEE, le contenu du frigo et les préférences culturelles

---

## Annexe : Architecture des données

Le flux de données de CuisineConnect suit le schéma suivant :

```
╔══════════════════╗    ╔══════════════════╗    ╔══════════════════╗
║  Sources externes ║    ║  Base de données  ║    ║  Utilisateur     ║
╠══════════════════╣    ╠══════════════════╣    ╠══════════════════╣
║ TheMealDB        ║ →  ║ recipes          ║    ║ Frigo (pantry)   ║
║ Spoonacular      ║    ║ ingredients      ║    ║ Objectif (goal)  ║
║ OpenFoodFacts    ║ →  ║ ingredient_syns  ║    ║ Profil (TDEE)    ║
║ USDA FoodData    ║ →  ║ (usdaFdcId)      ║    ╚══════════════════╝
║ Vidéo (yt-dlp)  ║ →  ║ embeddings       ║            │
╚══════════════════╝    ╚══════════════════╝            │
         │                       │                      │
         ↓                       ↓                      ↓
╔══════════════════════════════════════════════════════════════╗
║                    Moteur de matching                        ║
║  ┌─────────────────┐    ┌──────────────────────────────┐    ║
║  │ matchScore      │    │ Filtres nutritionnels         │    ║
║  │ (pantry ∩ ing.) │    │ computeNutrition() vs TDEE   │    ║
║  └─────────────────┘    └──────────────────────────────┘    ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │ Recherche sémantique (pgvector, cosine similarity)  │    ║
║  └─────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════╝
                              │
                              ↓
╔══════════════════════════════════════════════════════════════╗
║                    Interface utilisateur                     ║
║  /suggestions  →  Recettes classées par matchScore          ║
║  /nutrition    →  Dashboard macros vs objectifs TDEE        ║
║  /feed         →  Feed social + recherche sémantique IA     ║
║  /discover     →  Exploration par cuisine / catégorie       ║
║  /shopping     →  Liste de courses auto-générée             ║
╚══════════════════════════════════════════════════════════════╝
```

---

*Document rédigé avec l'assistance de l'IA (requis par le règlement EPITA pour les projets utilisant des outils d'intelligence artificielle).*
