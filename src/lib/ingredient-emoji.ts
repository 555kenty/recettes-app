/**
 * Returns a single emoji for a given ingredient name + optional DB category.
 * Used on the recipe detail page and the fridge page.
 */
export function getIngredientEmoji(name: string, category?: string | null): string {
  const n = (name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ── Viandes & protéines ──────────────────────────────────────────────────
  if (/poulet|volaille|blanc.*(poulet|dinde)|cuisse|dinde/.test(n)) return '🍗';
  if (/boeuf|veau|steak|viande.hach|entrecote|faux.filet/.test(n)) return '🥩';
  if (/agneau|mouton|gigot/.test(n)) return '🫕';
  if (/porc|jambon|lardon|bacon|travers/.test(n)) return '🥓';
  if (/saucisse|chorizo|merguez|andouill|knack|frankfurter/.test(n)) return '🌭';
  if (/crevette|homard|crabe|langouste|fruits.de.mer/.test(n)) return '🦐';
  if (/thon|saumon|cabillaud|tilapia|daurade|bar\b|maquereau|sardine|poisson/.test(n)) return '🐟';
  if (/\boeuf\b|\boeufs\b|oeuf/.test(n)) return '🥚';

  // ── Légumes ───────────────────────────────────────────────────────────────
  if (/tomat/.test(n)) return '🍅';
  if (/oignon|echalote|cebette/.test(n)) return '🧅';
  if (/\bail\b|gousses?.d.ail|ail.*ecrase/.test(n)) return '🧄';
  if (/carotte/.test(n)) return '🥕';
  if (/poivron/.test(n)) return '🫑';
  // piment oiseau et variantes chaudes avant le générique
  if (/piment.oiseau|piment.fort|piment.antillais|scotch.bonnet|habanero|jalapeno|chili/.test(n)) return '🌶️';
  if (/\bpiment\b/.test(n)) return '🌶️';
  if (/aubergine/.test(n)) return '🍆';
  if (/courgette/.test(n)) return '🥒';
  if (/concombre/.test(n)) return '🥒';
  if (/brocoli|chou.fleur|chou/.test(n)) return '🥦';
  if (/champignon/.test(n)) return '🍄';
  if (/epinard/.test(n)) return '🥬';
  if (/salade|laitue|roquette/.test(n)) return '🥗';
  if (/pomme.de.terre|patate/.test(n)) return '🥔';
  if (/mais/.test(n)) return '🌽';
  if (/avocat/.test(n)) return '🥑';
  if (/poireau|celeri|fenouil|navet|radis|betterave/.test(n)) return '🥬';

  // ── Fruits ────────────────────────────────────────────────────────────────
  if (/citron/.test(n)) return '🍋';
  if (/orange/.test(n)) return '🍊';
  if (/pomme/.test(n)) return '🍎';
  if (/banane/.test(n)) return '🍌';
  if (/mangue/.test(n)) return '🥭';
  if (/ananas/.test(n)) return '🍍';
  if (/fraise/.test(n)) return '🍓';
  if (/coco|noix.de.coco|lait.de.coco|creme.de.coco/.test(n)) return '🥥';
  if (/passion|fruit.de.la.passion/.test(n)) return '🍑';

  // ── Laitiers ──────────────────────────────────────────────────────────────
  if (/beurre/.test(n)) return '🧈';
  if (/\blait\b/.test(n)) return '🥛';
  if (/fromage|mozzarella|parmesan|cheddar|gruyere|emmental|feta|ricotta|camembert/.test(n)) return '🧀';
  if (/creme.fraiche|creme.liquide|creme.entiere/.test(n)) return '🥛';
  if (/yaourt|yogourt/.test(n)) return '🥛';

  // ── Féculents & céréales ─────────────────────────────────────────────────
  if (/\briz\b/.test(n)) return '🍚';
  if (/pate\b|spaghetti|tagliatelle|nouille|macaroni|fusilli|penne/.test(n)) return '🍝';
  if (/\bpain\b|baguette/.test(n)) return '🍞';
  if (/farine/.test(n)) return '🌾';
  if (/couscous|semoule/.test(n)) return '🫘';
  if (/lentille|pois.chiche|haricot|flageolet/.test(n)) return '🫘';

  // ── Épices & aromates — règles spécifiques avant les génériques ───────────
  if (/\bsel\b|sel.fin|fleur.de.sel|sel.de.mer/.test(n)) return '🧂';
  if (/\bpoivre\b|poivre.noir|poivre.blanc/.test(n)) return '🫚';
  if (/curcuma|safran/.test(n)) return '🟡';
  if (/curry|colombo|massale|ras.el.hanout/.test(n)) return '🫚';
  if (/paprika/.test(n)) return '🫚';
  if (/cumin|fenugrec|cardamome|muscade|cannelle|girofle|anis.etoile|badiane/.test(n)) return '🫚';
  if (/gingembre/.test(n)) return '🫚';
  if (/thym|romarin|basilic|persil|coriandre|laurier|estragon|menthe|origan|ciboulette|sarriette/.test(n)) return '🌿';
  if (/vanille/.test(n)) return '🌿';
  if (/levure/.test(n)) return '🌾';

  // ── Condiments & liquides ─────────────────────────────────────────────────
  if (/huile/.test(n)) return '🫙';
  if (/vinaigre/.test(n)) return '🍶';
  if (/sauce.soja|sauce.tomate|ketchup|worcestershire|tabasco/.test(n)) return '🍶';
  if (/moutarde/.test(n)) return '🫙';
  if (/sucre/.test(n)) return '🍬';
  if (/miel/.test(n)) return '🍯';
  if (/chocolat/.test(n)) return '🍫';
  if (/\beau\b/.test(n)) return '💧';
  if (/bouillon|fond.de/.test(n)) return '🍲';
  if (/\bvin\b|vin.blanc|vin.rouge|vin.rose/.test(n)) return '🍷';
  if (/biere/.test(n)) return '🍺';

  // ── Fallback catégorie DB puis générique ──────────────────────────────────
  if (category === 'Viandes')  return '🥩';
  if (category === 'Légumes')  return '🥕';
  if (category === 'Fruits')   return '🍋';
  if (category === 'Poissons') return '🐟';
  if (category === 'Laitiers') return '🥛';
  if (category === 'Épices')   return '🌿';
  if (category === 'Féculents') return '🍚';

  return '🫙';
}
