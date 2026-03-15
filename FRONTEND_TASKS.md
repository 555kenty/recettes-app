# FRONTEND_TASKS.md — CuisineConnect · Redesign UI/UX complet

> Objectif : transformer l'app d'un look "généré par IA" en une app culinaire éditoriale, premium, propre.
> Inspirations cibles : Bon Appétit, Marmiton (nouvelle version), NYT Cooking, Yummly
> Dernière mise à jour : 2026-03-15

---

## 🎨 Système de design à établir AVANT tout

### Palette de couleurs
```
Fond principal    : #FAFAF7  (crème chaud, pas blanc froid)
Fond secondaire   : #F2F1EC  (crème légèrement plus sombre)
Texte principal   : #1C1917  (charcoal chaud, pas noir pur)
Texte secondaire  : #78716C  (stone-500)
Accent principal  : #C2410C  (orange-700 — rostre profond)
Accent hover      : #9A3412  (orange-800)
Accent doux       : #FED7AA  (orange-200 — warm tint)
Bordure           : #E7E5E4  (stone-200)
Badge IA          : #7C3AED  (violet-600 — distinct des accents food)
```

### Typographie
- **Titres h1/h2** : `font-serif` ou classe `font-display` → ajouter Google Font "Playfair Display" ou "Lora" pour les headers éditoriaux
- **Corps** : Inter (déjà en place), weight 400/500
- **Labels/badges** : `text-xs font-semibold tracking-wider uppercase`
- **Règle** : jamais de `font-bold` sur du corps de texte long

### Rayon des coins
- Cards : `rounded-2xl` (déjà en place — OK)
- Boutons primaires : `rounded-full` (pill) → plus premium que `rounded-xl`
- Inputs : `rounded-xl` (OK)
- Modals : `rounded-3xl` (OK)

### Ombres
```css
--shadow-card : 0 1px 3px rgb(0 0 0 / 0.06), 0 4px 12px rgb(0 0 0 / 0.04);
--shadow-hover: 0 8px 30px rgb(0 0 0 / 0.10), 0 2px 8px rgb(0 0 0 / 0.06);
```
Utiliser `shadow-[0_1px_3px_rgb(0,0,0,0.06),0_4px_12px_rgb(0,0,0,0.04)]` en Tailwind JIT.

---

## SECTION 1 — Auth & Onboarding

### 1.1 Layout auth (`(auth)/layout.tsx`)
**Problème actuel** : fond dégradé slate-900 générique + carte blanche centrée → cliché.

**Redesign** : Split layout 50/50 sur desktop
- **Gauche** : panel éditorial sombre avec une grande photo food en full-cover (TheMealDB image ou Unsplash), overlay gradient + logo + citation culinaire
- **Droite** : fond crème `#FAFAF7` avec le formulaire
- **Mobile** : seulement le formulaire, sans panel photo
- Ajouter une transition `opacity + translateY` en entrée

```tsx
// Structure cible layout.tsx
<div className="min-h-screen grid lg:grid-cols-2">
  {/* Panel gauche — éditorial */}
  <div className="hidden lg:flex relative bg-stone-900 flex-col justify-between p-12">
    <img src="..." className="absolute inset-0 w-full h-full object-cover opacity-40" />
    <div className="relative z-10">
      {/* Logo blanc */}
    </div>
    <div className="relative z-10">
      {/* Citation culinaire + crédits recette */}
    </div>
  </div>
  {/* Panel droit — formulaire */}
  <div className="flex items-center justify-center p-8 bg-[#FAFAF7]">
    {children}
  </div>
</div>
```

### 1.2 Page Login (`(auth)/login/page.tsx`)
**Problème actuel** : texte blanc sur fond slate (côté gauche), formulaire white card — trop classique.

**Redesign** :
- [ ] Supprimer le fond blanc de la card — le formulaire flotte directement sur le fond crème
- [ ] Logo + titre avec typographie éditoriale (Playfair/Lora)
- [ ] Inputs avec bordure bottom-only style (underline input) ou fond `stone-100` sans bordure visible
- [ ] Bouton primary = fond `#C2410C` pill shape, full-width
- [ ] Boutons OAuth redesignés : fond blanc, bordure stone-200 fine, icône + label propres
- [ ] Animation `motion.div` stagger sur les champs (0.05s entre chaque)
- [ ] Message d'erreur avec icône AlertCircle, fond `rose-50`, texte `rose-700`

### 1.3 Page Register (`(auth)/register/page.tsx`)
Même traitement que login +
- [ ] Ajouter un indicateur de force du mot de passe (barre colorée)
- [ ] Confirmation de mot de passe avec validation en temps réel (check vert)
- [ ] Animation de succès avant redirect (checkmark animé)

### 1.4 Onboarding — Sélection objectif (dans `page.tsx`, view='goal')
**Problème actuel** : 3 cards génériques sur fond slate-50 — ressemble à une page "choisir un plan tarifaire".

**Redesign** : immersif, personnel, culinaire
- [ ] Fond `#FAFAF7` avec texture légère (pattern SVG grain subtil)
- [ ] Titre en Playfair Display : _"Quelle cuisine vous inspire ?"_
- [ ] Cards plus grandes, pleine hauteur, avec :
  - Photo food en background semi-transparent (Unsplash : bowl salade verte pour lose, steak pour sport, plat coloré pour cook)
  - Overlay dégradé sombre en bas
  - Texte blanc en bas
  - Hover : scale(1.02) + ombre profonde
- [ ] Animation stagger (0.1s) sur l'apparition des cards
- [ ] Une fois sélectionné : animation de check + transition vers l'app (pas de brusque switch)

---

## SECTION 2 — Landing Page (non connecté)

**Problème actuel** : Bonne base mais colonne droite vide (juste un placeholder chef hat), pas d'impact visuel.

### 2.1 Hero section
- [ ] Colonne droite : vraie grille de photos de recettes (3-4 images récupérées de TheMealDB), arrangées en mosaic ou carousel auto-scroll
- [ ] Typographie du titre : "Cuisine**Connect**" avec Playfair Display pour le "CuisineConnect"
- [ ] Sous-titre plus évocateur : "Cuisinez avec ce que vous avez. Découvrez le reste du monde."
- [ ] Bouton CTA primary redesigné en pill `#C2410C`
- [ ] Badge "598 recettes" avec icône globe plutôt que sparkles

### 2.2 Section features (à créer sous le hero)
- [ ] 3 colonnes avec icônes custom SVG (pas lucide generics) :
  - Frigo → Match de recettes
  - IA sémantique → Recherche naturelle
  - Communauté → Partage de recettes
- [ ] Fond légèrement différent du hero (alternance crème/blanc)

### 2.3 Section "Recettes du monde" (à créer)
- [ ] Grid horizontale scroll (overflow-x) de quelques RecipeCards
- [ ] CTA "Voir toutes les recettes" → `/feed`

---

## SECTION 3 — App principale (`page.tsx`)

**Problème critique** : les recipe cards dans l'onglet "Recettes" et "Suggestions" ne permettent pas de naviguer vers le détail. Il faut wrapper chaque card d'un `<Link href="/recipes/{id}">`.

### 3.1 Navigation / Sidebar
**Problème actuel** : sidebar avec boutons actifs en dégradé rose/amber — trop flashy, peu raffiné.

**Redesign sidebar** :
- [ ] Fond sidebar `#FAFAF7` au lieu de `white`, bordure droite `stone-200`
- [ ] Item actif : fond `stone-900` (sombre), texte blanc — contraste fort + premium
- [ ] Item inactif : texte `stone-600`, hover fond `stone-100`
- [ ] Logo redesigné : icône chef hat SVG custom + "Cuisine**Connect**" en deux weights
- [ ] Section user en bas : avatar initiale stylisé + nom + objectif, bouton logout discret
- [ ] Ajouter lien vers `/feed` dans la nav (icône Globe ou Compass)

**Redesign nav mobile (bottom bar)** :
- [ ] Fond blanc avec `backdrop-blur` léger
- [ ] Icônes plus fines (stroke-width=1.5)
- [ ] Active state : juste `text-orange-700` + underline dot, pas de fond coloré
- [ ] Label sous chaque icône (tiny text)

### 3.2 Tab Frigo
**Problème actuel** : toutes les cards du frigo ont la même icône `<Leaf>` peu importe la catégorie.

**Redesign** :
- [ ] Icône par catégorie : Légumes→Leaf, Fruits→Apple, Viandes→Beef emoji SVG, Poissons→Fish, Laitiers→Milk, Épices→FlaskConical
- [ ] Card ingrédient redesignée : plus compacte, pill shape au lieu de carré, affichage en liste pill style (comme des tags) plutôt qu'une grille
- [ ] Bouton "Supprimer" : seulement visible au hover (opacity-0 → opacity-100)
- [ ] Modal ajout redesigné :
  - Input avec autocomplete (déjà api `/api/ingredients/search`) — brancher l'autocomplete
  - Suggestions dropdown sous l'input
  - Categories en pills horizontaux compacts
  - Animation bottom sheet sur mobile (translate y)
- [ ] Empty state illustré (SVG d'un frigo ouvert vide)

### 3.3 Tab Suggestions
**Problème actuel** : les cards ne naviguent pas vers le détail.

**Fix critique** :
- [ ] Wrapper chaque card suggestion en `<Link href={'/recipes/' + r.id}>`
- [ ] Badge match score stylisé : vert `#16A34A` pour >80%, orange pour 50-80%
- [ ] Section "Il manque" redesignée : liste de pills orange avec icône `+` pour ajouter à la liste de courses directement
- [ ] CTA "Ajouter aux courses" : bouton secondaire propre, pas inline

### 3.4 Tab Recettes (Discover)
**Problème actuel** : grid basique, pas de navigation vers le détail, pas de distinction visuelle.

**Fix critique + redesign** :
- [ ] Chaque card = `<Link href={'/recipes/' + recipe.id}>` (utiliser le composant `RecipeCard` déjà fait dans `/feed`)
- [ ] Header de section redesigné : titre éditorial + compteur discret
- [ ] Barre de recherche redesignée : pill shape, icône search intégrée, fond `stone-100`
- [ ] Filtres rapides en pills horizontaux scrollables (catégories) sous la recherche
- [ ] Loading state : skeletons avec shimmer animation (pas juste un spinner)
- [ ] Empty state avec illustration et suggestion de vider les filtres

### 3.5 Tab Shopping (Liste de courses)
**Problème actuel** : fonctionnel mais très basique.

**Redesign** :
- [ ] Header avec compteur animé (nombre d'articles restants)
- [ ] Items groupés par catégorie automatiquement si possible
- [ ] Case à cocher redesignée : checkbox custom avec animation de coché (stroke SVG)
- [ ] Item coché : texte barré + opacité réduite + déplacement en bas de liste
- [ ] Bouton "Tout effacer les cochés" en bas
- [ ] Input d'ajout : full-width, fond `stone-100`, placeholder informatif
- [ ] Empty state avec icône panier et CTA vers Suggestions

### 3.6 Tab Profil
**Problème actuel** : très minimaliste, manque d'infos et d'actions.

**Redesign** :
- [ ] Hero profil avec background gradient warm + avatar centré
- [ ] Stats grid : Ingrédients frigo, Favoris, Recettes créées, Courses
- [ ] Section "Mon objectif" avec possibilité de changer
- [ ] Lien vers le profil public `/u/[username]`
- [ ] Lien vers "Mes recettes créées"
- [ ] Lien vers `/feed` pour découvrir
- [ ] Bouton déconnexion en bas, déstructif, avec confirmation

---

## SECTION 4 — RecipeCard Component

**Fichier** : `src/app/components/RecipeCard.tsx`

**Problème actuel** : correct mais manque de personnalité. Le ratio image (aspect-video = 16:9) est trop "vidéo", les food cards préfèrent du 4:3 ou même carré.

**Redesign** :
- [ ] Ratio image : `aspect-[4/3]` au lieu de `aspect-video`
- [ ] Image hover : `scale-110` au lieu de `scale-105` (plus dramatique)
- [ ] Overlay gradient toujours visible sur l'image (pas seulement le badge cuisine) — bottom gradient léger pour lisibilité
- [ ] Badge cuisine : fond `stone-900/80` backdrop-blur → plus élégant que `black/60`
- [ ] Titre : `font-serif` (Playfair) pour les titres de recettes
- [ ] Bouton like : animation pulse sur activation (`scale-125` → `scale-100`)
- [ ] Footer de card : séparateur visuel entre titre et méta-données
- [ ] Enlever `group-hover:text-rose-500` sur le titre → trop web1.0
- [ ] Ajouter : catégorie (tag) sous le titre
- [ ] Card hover effect : `shadow-[var(--shadow-hover)]` + `translateY(-2px)` → déjà partiellement fait, affiner

---

## SECTION 5 — Page Détail Recette (`/recipes/[id]/page.tsx`)

**Globalement bien fait, quelques améliorations premium** :

### 5.1 Hero
- [ ] Image hero : hauteur `h-[55vh]` au lieu de `h-64/80/96` fixe — plus cinématique
- [ ] Bouton retour : style éditorial — flèche ← + "Retour" en texte, fond `white/10` backdrop-blur
- [ ] Badges en haut à gauche sur l'image : cuisine + difficulté + badge IA si enriched
- [ ] Titre en Playfair Display, plus grand sur desktop (`text-4xl lg:text-5xl`)
- [ ] Ajouter un lien auteur sous le titre si `recipe.authorId` existe

### 5.2 Méta-données
- [ ] Pill-style horizontal avec icônes, fond `stone-100`, pas de bordure
- [ ] Ajouter bouton "Partager" (copie URL dans clipboard) + bouton "Ajouter aux favoris"
- [ ] Section tags : plus compacts, `#tag` style subtle

### 5.3 Ingrédients
- [ ] Colonne sticky sur desktop (`lg:sticky lg:top-4`)
- [ ] Liste mieux aérée avec icône dot colorée par catégorie d'ingrédient si disponible
- [ ] Bouton "Tout ajouter aux courses" en bas de la liste ingrédients

### 5.4 Étapes (checkable)
- [ ] Numéro d'étape : cercle `stone-900` texte blanc, `bg-orange-700` quand active
- [ ] Description plus aérée, taille `text-base`
- [ ] Tip : style "note de chef" — fond `amber-50`, bordure gauche `amber-400`, icône spatule ou chef
- [ ] Barre de progression en haut de la section steps (X/Y étapes complétées)

### 5.5 Commentaires
- [ ] Thread visuellement plus aéré
- [ ] Avatar coloré par hash du nom (pas juste gris pour tous)
- [ ] Date relative (il y a 2h) au lieu de date absolue

---

## SECTION 6 — Feed (`/feed/page.tsx`)

### 6.1 Header
**Problème** : le feed n'est pas intégré dans la navigation de l'app principale (pas de sidebar).

- [ ] Créer un layout partagé pour `/feed` qui inclut la sidebar de l'app principale OU
- [ ] Ajouter une topbar standalone pour le feed avec : logo + lien retour accueil + boutons filtres

### 6.2 Page feed
- [ ] Titre de page éditorial : "Découvrir" avec sous-titre "598 recettes du monde entier"
- [ ] Filtres de cuisine : bande horizontale scrollable avec drapeaux emoji + nom pays
- [ ] Grid : alternance de tailles (1 grande card + 2 petites) pour les 3 premières positions, puis grid uniforme — layout magazine
- [ ] Skeletons : shimmer animation avec vraie forme de card (image + lignes texte)
- [ ] Bouton AI Search : plus visible, avec tooltip explicatif au premier survol

---

## SECTION 7 — Profil public (`/u/[username]/page.tsx`)

*(Pas encore lu mais existe)*
- [ ] Lire le fichier et auditer
- [ ] Hero avec cover image (ou gradient basé sur le nom) + avatar + stats
- [ ] Grid des recettes publiques de l'utilisateur
- [ ] Bouton Follow redesigné

---

## SECTION 8 — Formulaire création recette (`/recipes/new/page.tsx`)

*(Pas encore lu mais existe)*
- [ ] Lire le fichier et auditer
- [ ] Stepper progress en haut (Infos → Ingrédients → Étapes → Photo)
- [ ] Upload image avec preview drag & drop
- [ ] Section ingrédients avec autocomplete (brancher `/api/ingredients/search`)
- [ ] Étapes réordonnables (drag) ou au minimum numérotées clairement

---

## SECTION 9 — États globaux à créer

### Loader global
- [ ] Composant `<PageLoader />` : spinner éditorial (cercle fin, couleur `stone-900`) — remplacer tous les `animate-spin` Loader2 rose

### Toast notifications
- [ ] Créer `src/app/components/Toast.tsx` : notifications en bas à droite, style minimal
  - Succès : fond `stone-900` texte blanc, icône check
  - Erreur : fond `rose-600` texte blanc
  - Info : fond `stone-700` texte blanc
  - Auto-dismiss 3s avec barre de progression

### Empty states
- [ ] Créer des illustrations SVG inline pour : frigo vide, liste courses vide, aucune recette
- [ ] Style : line art simple, couleur `stone-300`

---

## SECTION 10 — Polish & Micro-interactions

- [ ] **Framer Motion** : ajouter `layoutId` sur les RecipeCards pour transitions fluides si on implémente un modal detail
- [ ] **Scroll restoration** : sauvegarder la position scroll dans le feed au retour
- [ ] **Image lazy loading** : ajouter `loading="lazy"` + placeholder blur sur toutes les images
- [ ] **Focus states** : tous les éléments interactifs doivent avoir un `focus-visible:ring-2 ring-orange-700 ring-offset-2`
- [ ] **Transitions de page** : `motion.div` avec `initial={{opacity:0}} animate={{opacity:1}}` sur chaque page principale

---

## État de la DB (peuplement)

| Donnée | Status | Détails |
|---|---|---|
| Recettes TheMealDB | ✅ 598/598 | Importées, toutes disponibles |
| Enrichissement IA | 🔄 ~400/598 | Script Gemini 2.5-flash, 40% environ restant |
| Embeddings pgvector | 🔄 ~100/596 | Script Gemini text-embedding-004, majorité manquante |
| Ingrédients OFF | ✅ 194 | OpenFoodFacts, catégories de base couvertes |
| Synonymes ingrédients | ✅ 876 | Améliore le matching frigo→recettes |
| Recettes Antillaises/Haïtiennes | ❌ 0 | TheMealDB n'en a pas → besoin Spoonacular ou créa manuelle |

**Actions DB restantes** :
- [ ] Relancer `node scripts/enrich-recipes.js --limit=200` pour enrichir le reste
- [ ] Relancer `node scripts/generate-embeddings.js --limit=600` pour les embeddings restants
- [ ] Configurer les callback URLs OAuth dans Google Console et GitHub Apps

---

## Ordre d'exécution recommandé

```
Priorité 1 (impact visuel immédiat, peu de risque) :
  [x] Établir la palette + typographie dans globals.css / tailwind.config.js
  [ ] Redesign RecipeCard (utilisé partout)
  [ ] Fix critique : navigation vers /recipes/[id] depuis main app (page.tsx)
  [ ] Redesign auth layout (split panel)
  [ ] Redesign login/register pages
  [ ] Redesign onboarding goal selection

Priorité 2 (améliore l'expérience cœur) :
  [ ] Sidebar + nav mobile redesign
  [ ] Tab Frigo : icônes par catégorie + autocomplete modal
  [ ] Tab Recettes : RecipeCard + filtres pills
  [ ] Page détail recette : hero + steps + progression

Priorité 3 (polish) :
  [ ] Toast system
  [ ] Empty states illustrés
  [ ] Feed : layout magazine + intégration nav
  [ ] Profil public
  [ ] Micro-interactions + focus states
```
