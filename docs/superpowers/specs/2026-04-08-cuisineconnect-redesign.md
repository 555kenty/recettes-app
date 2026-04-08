# CuisineConnect — Spec Redesign UI + Synthèse PFA
Date : 2026-04-08 | Équipe : Quentin ARBAUT / Rayan MOUSSA / Christian AZIAKA | EPITA PFA 2026

## Contexte

Refonte complète du design de CuisineConnect pour coller aux maquettes mobile validées (4 écrans), alignée avec le Brief Design officiel. La soutenance a lieu le 09/04/2026.

## Design System

### Palette (remplacement Tailwind)

| Token | Hex | Rôle |
|---|---|---|
| `brand-500` | `#C4583A` | Terracotta — CTA, accents principaux |
| `brand-600` | `#9B3E25` | Terracotta dark — hover, hero dark |
| `canvas-50` | `#FDF6EE` | Cream — fond de page |
| `canvas-100` | `#FFF8F0` | Blanc chaud — fond des cards |
| `canvas-200` | `#F0E6DC` | Beige — bordures |
| `olive-500` | `#5C7A3A` | Olive — protéines, badges frigo |
| `olive-100` | `#EEF4E8` | Olive clair — fond badge frigo |
| `honey-500` | `#D4930D` | Ambre — lipides, accents secondaires |
| `honey-100` | `#FBF3DC` | Ambre clair — fond badge lipides |
| `night` | `#1C1410` | Brun nuit — hero landing, navbar |
| `warm-700` | `#6B4226` | Brun chaud — texte fort, glucides |

Règle : jamais de `#FFFFFF` en fond. Toujours des blancs chauds (canvas-50/100).

### Typographie

- **Titres** : Playfair Display (Bold/ExtraBold) — via next/font/google
- **Corps / UI** : DM Sans (Regular/Medium/Bold) — via next/font/google
- **Inter** : supprimé (remplacé par DM Sans)

### Composants

- Border-radius : `rounded-2xl` (cards), `rounded-xl` (boutons), `rounded-lg` (tags/badges), `rounded-full` (avatars)
- Ombres chaudes : `box-shadow: 0 1px 3px rgba(44,24,16,0.06), 0 4px 12px rgba(44,24,16,0.04)` (repos) / `rgba(44,24,16,0.12)` (hover)
- Bouton primaire : gradient `from-brand-500 to-brand-600`, texte blanc
- Bouton secondaire : fond transparent, bordure canvas-200, texte warm-700
- Animations : `transition-all duration-200 ease-out`, hover lift `translate-y-[-2px]`

## Pages à redesigner

### 1. Landing (`src/app/page.tsx`)
- Hero dark (`bg-night`) avec badge "87% match frigo", H1 Playfair 48px, sous-titre, 2 CTA
- Section stats : 600+ recettes, 4 datasets, 0.7s AI search, 24/7
- Section "Comment ça marche ?" : 3 cards Fridge / World / Macros sur fond canvas-50
- CTA footer dark
- Navbar avec logo + avatar

### 2. Dashboard (`src/app/(dashboard)/fridge/page.tsx`)
- Greeting "Bienvenue, Chef."
- Card Profil Santé : IMC, TDEE, Objectif
- Card Macros du jour : 4 progress bars colorées (calories/protéines/lipides/glucides)
- Card "Conseil du Chef IA"
- Section Mon Frigo : grille emoji ingrédients
- Section Suggestions : liste avec score match circulaire

### 3. Recette détail (`src/app/(app)/recipes/[id]/page.tsx`)
- Hero image full-width, badge cuisine + match score
- Méta : temps, difficulté, portions, likes
- Card nutrition : grand chiffre kcal + barres macro
- CTA "Ajouter à mon journal" (rouge terracotta)
- Ingrédients avec badges DANS LE FRIGO / MANQUANT
- Étapes numérotées

### 4. Feed/RecipeBrowser (`src/app/components/RecipeBrowser.tsx`)
- Search bar + toggle IA animé
- Filtres cuisine en pills
- Card "Importer depuis vidéo" (dashed border)
- Recipe cards : image pleine, match %, titre, temps, kcal
- Posts communautaires avec avatar, texte, recette liée

## Document de Synthèse PFA

Fichier : `docs/synthese-pfa.md`

Structure :
1. Présentation du projet et problématique
2. Datasets utilisés et corrélations
3. Choix technologiques justifiés
4. Architecture technique
5. Fonctionnalités IA
6. Difficultés rencontrées et solutions
7. Résultats et métriques
8. Perspectives d'évolution

## Contraintes

- App déployée sur Vercel — chaque push déclenche un déploiement automatique
- Ne pas toucher `prisma/schema.prisma` (risque drop colonne `embedding`)
- Garder la compatibilité avec l'existant (API routes, auth, i18n)
- Pas de tests unitaires (hors scope pour ce projet)
