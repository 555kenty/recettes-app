import { prisma } from '@/lib/prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  name: string;
  quantity?: string | number | null;
  unit?: string | null;
}

export interface NutritionResult {
  kcal: number;
  proteins: number;
  fats: number;
  carbs: number;
  perServing: { kcal: number; proteins: number; fats: number; carbs: number };
  matchedCount: number;
}

interface MacroPer100g {
  kcal: number;
  proteins: number; // g
  fats: number;     // g
  carbs: number;    // g
}

// ─── Hardcoded lookup table ──────────────────────────────────────────────────
// Fallback when the Ingredient DB has no match. Keys are checked with
// substring matching (longest keys first) so "noix de coco" beats "noix".
// Values are per 100 g of edible portion.

const RAW_LOOKUP: [string, MacroPer100g][] = [
  // ── Viandes & volailles ─────────────────────────────────────────────────
  ['poulet',         { kcal: 165, proteins: 31,  fats: 3.6, carbs: 0   }],
  ['chicken',        { kcal: 165, proteins: 31,  fats: 3.6, carbs: 0   }],
  ['dinde',          { kcal: 135, proteins: 30,  fats: 1,   carbs: 0   }],
  ['turkey',         { kcal: 135, proteins: 30,  fats: 1,   carbs: 0   }],
  ['canard',         { kcal: 201, proteins: 19,  fats: 13,  carbs: 0   }],
  ['duck',           { kcal: 201, proteins: 19,  fats: 13,  carbs: 0   }],
  ['boeuf',          { kcal: 250, proteins: 26,  fats: 15,  carbs: 0   }],
  ['beef',           { kcal: 250, proteins: 26,  fats: 15,  carbs: 0   }],
  ['steak',          { kcal: 271, proteins: 26,  fats: 18,  carbs: 0   }],
  ['veau',           { kcal: 175, proteins: 30,  fats: 5,   carbs: 0   }],
  ['veal',           { kcal: 175, proteins: 30,  fats: 5,   carbs: 0   }],
  ['porc',           { kcal: 242, proteins: 27,  fats: 14,  carbs: 0   }],
  ['pork',           { kcal: 242, proteins: 27,  fats: 14,  carbs: 0   }],
  ['agneau',         { kcal: 282, proteins: 25,  fats: 20,  carbs: 0   }],
  ['lamb',           { kcal: 282, proteins: 25,  fats: 20,  carbs: 0   }],
  ['mutton',         { kcal: 294, proteins: 25,  fats: 21,  carbs: 0   }],
  ['chorizo',        { kcal: 455, proteins: 25,  fats: 38,  carbs: 2   }],
  ['merguez',        { kcal: 310, proteins: 14,  fats: 27,  carbs: 2   }],
  ['saucisse',       { kcal: 300, proteins: 12,  fats: 27,  carbs: 2   }],
  ['sausage',        { kcal: 300, proteins: 12,  fats: 27,  carbs: 2   }],
  ['lardons',        { kcal: 350, proteins: 18,  fats: 30,  carbs: 0   }],
  ['bacon',          { kcal: 417, proteins: 12,  fats: 42,  carbs: 1.4 }],
  ['jambon',         { kcal: 145, proteins: 22,  fats: 5.5, carbs: 1   }],
  ['ham',            { kcal: 145, proteins: 22,  fats: 5.5, carbs: 1   }],
  ['viande hachée',  { kcal: 254, proteins: 17,  fats: 20,  carbs: 0   }],
  ['ground beef',    { kcal: 254, proteins: 17,  fats: 20,  carbs: 0   }],
  ['viande',         { kcal: 200, proteins: 26,  fats: 10,  carbs: 0   }],
  ['meat',           { kcal: 200, proteins: 26,  fats: 10,  carbs: 0   }],
  // ── Poissons & fruits de mer ─────────────────────────────────────────────
  ['saumon',         { kcal: 208, proteins: 20,  fats: 13,  carbs: 0   }],
  ['salmon',         { kcal: 208, proteins: 20,  fats: 13,  carbs: 0   }],
  ['thon',           { kcal: 132, proteins: 28,  fats: 1,   carbs: 0   }],
  ['tuna',           { kcal: 132, proteins: 28,  fats: 1,   carbs: 0   }],
  ['cabillaud',      { kcal: 82,  proteins: 18,  fats: 0.7, carbs: 0   }],
  ['cod',            { kcal: 82,  proteins: 18,  fats: 0.7, carbs: 0   }],
  ['tilapia',        { kcal: 96,  proteins: 20,  fats: 1.7, carbs: 0   }],
  ['crevette',       { kcal: 99,  proteins: 24,  fats: 0.3, carbs: 0   }],
  ['shrimp',         { kcal: 99,  proteins: 24,  fats: 0.3, carbs: 0   }],
  ['prawn',          { kcal: 99,  proteins: 24,  fats: 0.3, carbs: 0   }],
  ['moule',          { kcal: 86,  proteins: 12,  fats: 2.2, carbs: 4   }],
  ['mussel',         { kcal: 86,  proteins: 12,  fats: 2.2, carbs: 4   }],
  ['homard',         { kcal: 89,  proteins: 19,  fats: 0.9, carbs: 0.5 }],
  ['lobster',        { kcal: 89,  proteins: 19,  fats: 0.9, carbs: 0.5 }],
  ['poisson',        { kcal: 120, proteins: 20,  fats: 4,   carbs: 0   }],
  ['fish',           { kcal: 120, proteins: 20,  fats: 4,   carbs: 0   }],
  // ── Féculents & céréales ─────────────────────────────────────────────────
  ['riz',            { kcal: 130, proteins: 2.7, fats: 0.3, carbs: 28  }],
  ['rice',           { kcal: 130, proteins: 2.7, fats: 0.3, carbs: 28  }],
  ['pâtes',          { kcal: 131, proteins: 5,   fats: 1.1, carbs: 25  }],
  ['pasta',          { kcal: 131, proteins: 5,   fats: 1.1, carbs: 25  }],
  ['spaghetti',      { kcal: 131, proteins: 5,   fats: 1.1, carbs: 25  }],
  ['tagliatelle',    { kcal: 131, proteins: 5,   fats: 1.1, carbs: 25  }],
  ['penne',          { kcal: 131, proteins: 5,   fats: 1.1, carbs: 25  }],
  ['farine',         { kcal: 364, proteins: 10,  fats: 1,   carbs: 76  }],
  ['flour',          { kcal: 364, proteins: 10,  fats: 1,   carbs: 76  }],
  ['chapelure',      { kcal: 395, proteins: 12,  fats: 4,   carbs: 77  }],
  ['breadcrumb',     { kcal: 395, proteins: 12,  fats: 4,   carbs: 77  }],
  ['pain',           { kcal: 265, proteins: 9,   fats: 3.2, carbs: 49  }],
  ['bread',          { kcal: 265, proteins: 9,   fats: 3.2, carbs: 49  }],
  ['baguette',       { kcal: 265, proteins: 9,   fats: 3.2, carbs: 49  }],
  ['pomme de terre', { kcal: 77,  proteins: 2,   fats: 0.1, carbs: 17  }],
  ['potato',         { kcal: 77,  proteins: 2,   fats: 0.1, carbs: 17  }],
  ['patate douce',   { kcal: 86,  proteins: 1.6, fats: 0.1, carbs: 20  }],
  ['sweet potato',   { kcal: 86,  proteins: 1.6, fats: 0.1, carbs: 20  }],
  ['patate',         { kcal: 77,  proteins: 2,   fats: 0.1, carbs: 17  }],
  ['couscous',       { kcal: 112, proteins: 3.8, fats: 0.2, carbs: 23  }],
  ['quinoa',         { kcal: 120, proteins: 4.4, fats: 1.9, carbs: 21  }],
  ['boulgour',       { kcal: 83,  proteins: 3.1, fats: 0.2, carbs: 19  }],
  ['bulgur',         { kcal: 83,  proteins: 3.1, fats: 0.2, carbs: 19  }],
  ['avoine',         { kcal: 389, proteins: 17,  fats: 7,   carbs: 66  }],
  ['oat',            { kcal: 389, proteins: 17,  fats: 7,   carbs: 66  }],
  ['maïs',           { kcal: 86,  proteins: 3.2, fats: 1.2, carbs: 19  }],
  ['corn',           { kcal: 86,  proteins: 3.2, fats: 1.2, carbs: 19  }],
  ['polenta',        { kcal: 78,  proteins: 1.7, fats: 0.4, carbs: 17  }],
  // ── Légumineuses ─────────────────────────────────────────────────────────
  ['pois chiche',    { kcal: 164, proteins: 8.9, fats: 2.6, carbs: 27  }],
  ['chickpea',       { kcal: 164, proteins: 8.9, fats: 2.6, carbs: 27  }],
  ['lentille',       { kcal: 116, proteins: 9,   fats: 0.4, carbs: 20  }],
  ['lentil',         { kcal: 116, proteins: 9,   fats: 0.4, carbs: 20  }],
  ['haricot rouge',  { kcal: 127, proteins: 8.7, fats: 0.5, carbs: 22  }],
  ['haricot',        { kcal: 127, proteins: 8.7, fats: 0.5, carbs: 22  }],
  ['bean',           { kcal: 127, proteins: 8.7, fats: 0.5, carbs: 22  }],
  ['pois cassés',    { kcal: 118, proteins: 8.3, fats: 0.4, carbs: 21  }],
  ['split pea',      { kcal: 118, proteins: 8.3, fats: 0.4, carbs: 21  }],
  ['edamame',        { kcal: 122, proteins: 11,  fats: 5.2, carbs: 9.9 }],
  ['tofu',           { kcal: 76,  proteins: 8,   fats: 4.8, carbs: 1.9 }],
  // ── Légumes ──────────────────────────────────────────────────────────────
  ['tomate cerise',  { kcal: 18,  proteins: 0.9, fats: 0.2, carbs: 3.9 }],
  ['tomate',         { kcal: 18,  proteins: 0.9, fats: 0.2, carbs: 3.9 }],
  ['tomato',         { kcal: 18,  proteins: 0.9, fats: 0.2, carbs: 3.9 }],
  ['oignon',         { kcal: 40,  proteins: 1.1, fats: 0.1, carbs: 9.3 }],
  ['onion',          { kcal: 40,  proteins: 1.1, fats: 0.1, carbs: 9.3 }],
  ['échalote',       { kcal: 72,  proteins: 2.5, fats: 0.1, carbs: 17  }],
  ['shallot',        { kcal: 72,  proteins: 2.5, fats: 0.1, carbs: 17  }],
  ['ail',            { kcal: 149, proteins: 6.4, fats: 0.5, carbs: 33  }],
  ['garlic',         { kcal: 149, proteins: 6.4, fats: 0.5, carbs: 33  }],
  ['carotte',        { kcal: 41,  proteins: 0.9, fats: 0.2, carbs: 9.6 }],
  ['carrot',         { kcal: 41,  proteins: 0.9, fats: 0.2, carbs: 9.6 }],
  ['céleri',         { kcal: 16,  proteins: 0.7, fats: 0.2, carbs: 3   }],
  ['celery',         { kcal: 16,  proteins: 0.7, fats: 0.2, carbs: 3   }],
  ['épinard',        { kcal: 23,  proteins: 2.9, fats: 0.4, carbs: 3.6 }],
  ['spinach',        { kcal: 23,  proteins: 2.9, fats: 0.4, carbs: 3.6 }],
  ['courgette',      { kcal: 17,  proteins: 1.2, fats: 0.3, carbs: 3.1 }],
  ['zucchini',       { kcal: 17,  proteins: 1.2, fats: 0.3, carbs: 3.1 }],
  ['poivron',        { kcal: 31,  proteins: 1,   fats: 0.3, carbs: 6   }],
  ['bell pepper',    { kcal: 31,  proteins: 1,   fats: 0.3, carbs: 6   }],
  ['champignon',     { kcal: 22,  proteins: 3.1, fats: 0.3, carbs: 3.3 }],
  ['mushroom',       { kcal: 22,  proteins: 3.1, fats: 0.3, carbs: 3.3 }],
  ['aubergine',      { kcal: 25,  proteins: 1,   fats: 0.2, carbs: 5.9 }],
  ['eggplant',       { kcal: 25,  proteins: 1,   fats: 0.2, carbs: 5.9 }],
  ['brocoli',        { kcal: 34,  proteins: 2.8, fats: 0.4, carbs: 6.6 }],
  ['broccoli',       { kcal: 34,  proteins: 2.8, fats: 0.4, carbs: 6.6 }],
  ['chou-fleur',     { kcal: 25,  proteins: 1.9, fats: 0.3, carbs: 5   }],
  ['cauliflower',    { kcal: 25,  proteins: 1.9, fats: 0.3, carbs: 5   }],
  ['chou',           { kcal: 25,  proteins: 1.3, fats: 0.1, carbs: 5.8 }],
  ['cabbage',        { kcal: 25,  proteins: 1.3, fats: 0.1, carbs: 5.8 }],
  ['poireau',        { kcal: 61,  proteins: 1.5, fats: 0.3, carbs: 14  }],
  ['leek',           { kcal: 61,  proteins: 1.5, fats: 0.3, carbs: 14  }],
  ['salade',         { kcal: 15,  proteins: 1.4, fats: 0.2, carbs: 2.3 }],
  ['lettuce',        { kcal: 15,  proteins: 1.4, fats: 0.2, carbs: 2.3 }],
  ['concombre',      { kcal: 16,  proteins: 0.7, fats: 0.1, carbs: 3.6 }],
  ['cucumber',       { kcal: 16,  proteins: 0.7, fats: 0.1, carbs: 3.6 }],
  ['radis',          { kcal: 16,  proteins: 0.7, fats: 0.1, carbs: 3.4 }],
  ['radish',         { kcal: 16,  proteins: 0.7, fats: 0.1, carbs: 3.4 }],
  ['fenouil',        { kcal: 31,  proteins: 1.2, fats: 0.2, carbs: 7.3 }],
  ['fennel',         { kcal: 31,  proteins: 1.2, fats: 0.2, carbs: 7.3 }],
  ['artichaut',      { kcal: 53,  proteins: 2.9, fats: 0.2, carbs: 11  }],
  ['artichoke',      { kcal: 53,  proteins: 2.9, fats: 0.2, carbs: 11  }],
  ['asperge',        { kcal: 20,  proteins: 2.2, fats: 0.1, carbs: 3.7 }],
  ['asparagus',      { kcal: 20,  proteins: 2.2, fats: 0.1, carbs: 3.7 }],
  ['betterave',      { kcal: 43,  proteins: 1.6, fats: 0.2, carbs: 9.6 }],
  ['beet',           { kcal: 43,  proteins: 1.6, fats: 0.2, carbs: 9.6 }],
  ['navet',          { kcal: 28,  proteins: 0.9, fats: 0.1, carbs: 6.4 }],
  ['turnip',         { kcal: 28,  proteins: 0.9, fats: 0.1, carbs: 6.4 }],
  ['potiron',        { kcal: 26,  proteins: 1,   fats: 0.1, carbs: 6.5 }],
  ['pumpkin',        { kcal: 26,  proteins: 1,   fats: 0.1, carbs: 6.5 }],
  ['courge',         { kcal: 26,  proteins: 1,   fats: 0.1, carbs: 6.5 }],
  ['squash',         { kcal: 26,  proteins: 1,   fats: 0.1, carbs: 6.5 }],
  ['gombo',          { kcal: 33,  proteins: 1.9, fats: 0.2, carbs: 7.5 }],
  ['okra',           { kcal: 33,  proteins: 1.9, fats: 0.2, carbs: 7.5 }],
  // ── Produits laitiers & œufs ──────────────────────────────────────────────
  ['crème fraîche',  { kcal: 292, proteins: 2.2, fats: 30,  carbs: 3.7 }],
  ['crème',          { kcal: 292, proteins: 2.2, fats: 30,  carbs: 3.7 }],
  ['cream',          { kcal: 292, proteins: 2.2, fats: 30,  carbs: 3.7 }],
  ['beurre',         { kcal: 717, proteins: 0.9, fats: 81,  carbs: 0.1 }],
  ['butter',         { kcal: 717, proteins: 0.9, fats: 81,  carbs: 0.1 }],
  ['parmesan',       { kcal: 431, proteins: 38,  fats: 29,  carbs: 3.2 }],
  ['mozzarella',     { kcal: 280, proteins: 28,  fats: 17,  carbs: 3.1 }],
  ['feta',           { kcal: 264, proteins: 14,  fats: 21,  carbs: 4   }],
  ['ricotta',        { kcal: 174, proteins: 11,  fats: 13,  carbs: 3   }],
  ['gruyère',        { kcal: 413, proteins: 29,  fats: 32,  carbs: 0.4 }],
  ['emmental',       { kcal: 380, proteins: 28,  fats: 29,  carbs: 1.5 }],
  ['fromage',        { kcal: 402, proteins: 25,  fats: 33,  carbs: 1.3 }],
  ['cheese',         { kcal: 402, proteins: 25,  fats: 33,  carbs: 1.3 }],
  ['lait de coco',   { kcal: 197, proteins: 2,   fats: 21,  carbs: 3   }],
  ['coconut milk',   { kcal: 197, proteins: 2,   fats: 21,  carbs: 3   }],
  ['lait',           { kcal: 61,  proteins: 3.2, fats: 3.3, carbs: 4.8 }],
  ['milk',           { kcal: 61,  proteins: 3.2, fats: 3.3, carbs: 4.8 }],
  ['yaourt',         { kcal: 59,  proteins: 3.5, fats: 3.3, carbs: 4.7 }],
  ['yogurt',         { kcal: 59,  proteins: 3.5, fats: 3.3, carbs: 4.7 }],
  ['yoghurt',        { kcal: 59,  proteins: 3.5, fats: 3.3, carbs: 4.7 }],
  ['œuf',            { kcal: 155, proteins: 13,  fats: 11,  carbs: 1.1 }],
  ['oeuf',           { kcal: 155, proteins: 13,  fats: 11,  carbs: 1.1 }],
  ['egg',            { kcal: 155, proteins: 13,  fats: 11,  carbs: 1.1 }],
  // ── Matières grasses ─────────────────────────────────────────────────────
  ['huile d\'olive', { kcal: 884, proteins: 0,   fats: 100, carbs: 0   }],
  ['huile',          { kcal: 884, proteins: 0,   fats: 100, carbs: 0   }],
  ['oil',            { kcal: 884, proteins: 0,   fats: 100, carbs: 0   }],
  ['ghee',           { kcal: 900, proteins: 0,   fats: 100, carbs: 0   }],
  ['margarine',      { kcal: 717, proteins: 0.2, fats: 80,  carbs: 0.7 }],
  ['saindoux',       { kcal: 902, proteins: 0,   fats: 100, carbs: 0   }],
  // ── Fruits ───────────────────────────────────────────────────────────────
  ['noix de coco',   { kcal: 354, proteins: 3.3, fats: 33,  carbs: 15  }],
  ['coconut',        { kcal: 354, proteins: 3.3, fats: 33,  carbs: 15  }],
  ['citron vert',    { kcal: 30,  proteins: 0.7, fats: 0.2, carbs: 10  }],
  ['citron',         { kcal: 29,  proteins: 1.1, fats: 0.3, carbs: 9.3 }],
  ['lemon',          { kcal: 29,  proteins: 1.1, fats: 0.3, carbs: 9.3 }],
  ['lime',           { kcal: 30,  proteins: 0.7, fats: 0.2, carbs: 10  }],
  ['orange',         { kcal: 47,  proteins: 0.9, fats: 0.1, carbs: 12  }],
  ['pomme',          { kcal: 52,  proteins: 0.3, fats: 0.2, carbs: 14  }],
  ['apple',          { kcal: 52,  proteins: 0.3, fats: 0.2, carbs: 14  }],
  ['banane',         { kcal: 89,  proteins: 1.1, fats: 0.3, carbs: 23  }],
  ['banana',         { kcal: 89,  proteins: 1.1, fats: 0.3, carbs: 23  }],
  ['mangue',         { kcal: 60,  proteins: 0.8, fats: 0.4, carbs: 15  }],
  ['mango',          { kcal: 60,  proteins: 0.8, fats: 0.4, carbs: 15  }],
  ['ananas',         { kcal: 50,  proteins: 0.5, fats: 0.1, carbs: 13  }],
  ['pineapple',      { kcal: 50,  proteins: 0.5, fats: 0.1, carbs: 13  }],
  ['avocat',         { kcal: 160, proteins: 2,   fats: 15,  carbs: 9   }],
  ['avocado',        { kcal: 160, proteins: 2,   fats: 15,  carbs: 9   }],
  ['raisin',         { kcal: 69,  proteins: 0.7, fats: 0.2, carbs: 18  }],
  ['grape',          { kcal: 69,  proteins: 0.7, fats: 0.2, carbs: 18  }],
  ['fraise',         { kcal: 32,  proteins: 0.7, fats: 0.3, carbs: 7.7 }],
  ['strawberry',     { kcal: 32,  proteins: 0.7, fats: 0.3, carbs: 7.7 }],
  ['amande',         { kcal: 579, proteins: 21,  fats: 50,  carbs: 22  }],
  ['almond',         { kcal: 579, proteins: 21,  fats: 50,  carbs: 22  }],
  ['noix de cajou',  { kcal: 553, proteins: 18,  fats: 44,  carbs: 30  }],
  ['cashew',         { kcal: 553, proteins: 18,  fats: 44,  carbs: 30  }],
  ['noix',           { kcal: 654, proteins: 15,  fats: 65,  carbs: 14  }],
  ['walnut',         { kcal: 654, proteins: 15,  fats: 65,  carbs: 14  }],
  ['cacahuète',      { kcal: 567, proteins: 26,  fats: 49,  carbs: 16  }],
  ['peanut',         { kcal: 567, proteins: 26,  fats: 49,  carbs: 16  }],
  ['pistache',       { kcal: 562, proteins: 20,  fats: 45,  carbs: 28  }],
  ['pistachio',      { kcal: 562, proteins: 20,  fats: 45,  carbs: 28  }],
  // ── Sauces & condiments ───────────────────────────────────────────────────
  ['sauce tomate',   { kcal: 24,  proteins: 1.4, fats: 0.2, carbs: 5   }],
  ['coulis',         { kcal: 24,  proteins: 1.4, fats: 0.2, carbs: 5   }],
  ['ketchup',        { kcal: 112, proteins: 1.4, fats: 0.2, carbs: 27  }],
  ['mayonnaise',     { kcal: 680, proteins: 1,   fats: 75,  carbs: 2   }],
  ['moutarde',       { kcal: 66,  proteins: 4.4, fats: 3.7, carbs: 5.8 }],
  ['mustard',        { kcal: 66,  proteins: 4.4, fats: 3.7, carbs: 5.8 }],
  ['sauce soja',     { kcal: 53,  proteins: 8.1, fats: 0.1, carbs: 4.9 }],
  ['soy sauce',      { kcal: 53,  proteins: 8.1, fats: 0.1, carbs: 4.9 }],
  ['vinaigre balsamique', { kcal: 88, proteins: 0.5, fats: 0, carbs: 17 }],
  ['vinaigre',       { kcal: 18,  proteins: 0,   fats: 0,   carbs: 0.9 }],
  ['vinegar',        { kcal: 18,  proteins: 0,   fats: 0,   carbs: 0.9 }],
  ['bouillon',       { kcal: 5,   proteins: 0.4, fats: 0.1, carbs: 0.7 }],
  ['stock',          { kcal: 5,   proteins: 0.4, fats: 0.1, carbs: 0.7 }],
  ['broth',          { kcal: 5,   proteins: 0.4, fats: 0.1, carbs: 0.7 }],
  ['concentré de tomate', { kcal: 82, proteins: 4, fats: 0.5, carbs: 18 }],
  ['tomato paste',   { kcal: 82,  proteins: 4,   fats: 0.5, carbs: 18  }],
  ['miel',           { kcal: 304, proteins: 0.3, fats: 0,   carbs: 82  }],
  ['honey',          { kcal: 304, proteins: 0.3, fats: 0,   carbs: 82  }],
  ['sucre',          { kcal: 387, proteins: 0,   fats: 0,   carbs: 100 }],
  ['sugar',          { kcal: 387, proteins: 0,   fats: 0,   carbs: 100 }],
  ['sirop d\'érable',{ kcal: 260, proteins: 0,   fats: 0.1, carbs: 67  }],
  ['sirop',          { kcal: 270, proteins: 0,   fats: 0,   carbs: 67  }],
  ['syrup',          { kcal: 270, proteins: 0,   fats: 0,   carbs: 67  }],
  ['chocolat noir',  { kcal: 546, proteins: 5,   fats: 31,  carbs: 60  }],
  ['chocolat',       { kcal: 546, proteins: 5,   fats: 30,  carbs: 60  }],
  ['chocolate',      { kcal: 546, proteins: 5,   fats: 30,  carbs: 60  }],
  ['cacao',          { kcal: 228, proteins: 20,  fats: 14,  carbs: 58  }],
  ['cocoa',          { kcal: 228, proteins: 20,  fats: 14,  carbs: 58  }],
  ['levure chimique',{ kcal: 53,  proteins: 0,   fats: 0,   carbs: 28  }],
  ['baking powder',  { kcal: 53,  proteins: 0,   fats: 0,   carbs: 28  }],
  ['levure',         { kcal: 41,  proteins: 5.1, fats: 0.7, carbs: 5   }],
  ['yeast',          { kcal: 41,  proteins: 5.1, fats: 0.7, carbs: 5   }],
  // ── Épices (quantités typiquement faibles) ────────────────────────────────
  ['sel',            { kcal: 0,   proteins: 0,   fats: 0,   carbs: 0   }],
  ['salt',           { kcal: 0,   proteins: 0,   fats: 0,   carbs: 0   }],
  ['poivre noir',    { kcal: 255, proteins: 10,  fats: 3.3, carbs: 64  }],
  ['black pepper',   { kcal: 255, proteins: 10,  fats: 3.3, carbs: 64  }],
  ['poivre',         { kcal: 255, proteins: 10,  fats: 3.3, carbs: 64  }],
  ['cumin',          { kcal: 375, proteins: 18,  fats: 22,  carbs: 44  }],
  ['coriandre',      { kcal: 298, proteins: 12,  fats: 17,  carbs: 55  }],
  ['coriander',      { kcal: 298, proteins: 12,  fats: 17,  carbs: 55  }],
  ['curry',          { kcal: 325, proteins: 14,  fats: 14,  carbs: 55  }],
  ['colombo',        { kcal: 325, proteins: 12,  fats: 14,  carbs: 55  }],
  ['masala',         { kcal: 325, proteins: 14,  fats: 14,  carbs: 55  }],
  ['curcuma',        { kcal: 312, proteins: 10,  fats: 3.3, carbs: 67  }],
  ['turmeric',       { kcal: 312, proteins: 10,  fats: 3.3, carbs: 67  }],
  ['paprika',        { kcal: 289, proteins: 14,  fats: 13,  carbs: 54  }],
  ['cannelle',       { kcal: 247, proteins: 4,   fats: 1.2, carbs: 80  }],
  ['cinnamon',       { kcal: 247, proteins: 4,   fats: 1.2, carbs: 80  }],
  ['gingembre',      { kcal: 80,  proteins: 1.8, fats: 0.8, carbs: 18  }],
  ['ginger',         { kcal: 80,  proteins: 1.8, fats: 0.8, carbs: 18  }],
  ['thym',           { kcal: 276, proteins: 9.1, fats: 7.4, carbs: 64  }],
  ['thyme',          { kcal: 276, proteins: 9.1, fats: 7.4, carbs: 64  }],
  ['romarin',        { kcal: 131, proteins: 3.3, fats: 5.9, carbs: 20  }],
  ['rosemary',       { kcal: 131, proteins: 3.3, fats: 5.9, carbs: 20  }],
  ['basilic',        { kcal: 23,  proteins: 3.2, fats: 0.6, carbs: 2.7 }],
  ['basil',          { kcal: 23,  proteins: 3.2, fats: 0.6, carbs: 2.7 }],
  ['persil',         { kcal: 36,  proteins: 3,   fats: 0.8, carbs: 6.3 }],
  ['parsley',        { kcal: 36,  proteins: 3,   fats: 0.8, carbs: 6.3 }],
  ['menthe',         { kcal: 70,  proteins: 3.8, fats: 0.9, carbs: 15  }],
  ['mint',           { kcal: 70,  proteins: 3.8, fats: 0.9, carbs: 15  }],
  ['estragon',       { kcal: 295, proteins: 23,  fats: 7,   carbs: 50  }],
  ['tarragon',       { kcal: 295, proteins: 23,  fats: 7,   carbs: 50  }],
  ['ciboulette',     { kcal: 30,  proteins: 3.3, fats: 0.7, carbs: 4.4 }],
  ['chive',          { kcal: 30,  proteins: 3.3, fats: 0.7, carbs: 4.4 }],
  ['piment',         { kcal: 40,  proteins: 1.9, fats: 0.4, carbs: 8.8 }],
  ['chili',          { kcal: 40,  proteins: 1.9, fats: 0.4, carbs: 8.8 }],
  ['safran',         { kcal: 310, proteins: 11,  fats: 5.9, carbs: 65  }],
  ['saffron',        { kcal: 310, proteins: 11,  fats: 5.9, carbs: 65  }],
  ['muscade',        { kcal: 525, proteins: 5.8, fats: 36,  carbs: 49  }],
  ['nutmeg',         { kcal: 525, proteins: 5.8, fats: 36,  carbs: 49  }],
  ['cardamome',      { kcal: 311, proteins: 11,  fats: 6.7, carbs: 68  }],
  ['cardamom',       { kcal: 311, proteins: 11,  fats: 6.7, carbs: 68  }],
  ['clou de girofle',{ kcal: 274, proteins: 6,   fats: 13,  carbs: 66  }],
  ['clove',          { kcal: 274, proteins: 6,   fats: 13,  carbs: 66  }],
  ['vanille',        { kcal: 288, proteins: 0.1, fats: 0.1, carbs: 12  }],
  ['vanilla',        { kcal: 288, proteins: 0.1, fats: 0.1, carbs: 12  }],
  ['anis',           { kcal: 337, proteins: 18,  fats: 15,  carbs: 50  }],
  ['anise',          { kcal: 337, proteins: 18,  fats: 15,  carbs: 50  }],
  ['laurier',        { kcal: 313, proteins: 7.6, fats: 8.4, carbs: 75  }],
  ['bay leaf',       { kcal: 313, proteins: 7.6, fats: 8.4, carbs: 75  }],
  ['fenugrec',       { kcal: 323, proteins: 23,  fats: 6,   carbs: 58  }],
  ['fenugreek',      { kcal: 323, proteins: 23,  fats: 6,   carbs: 58  }],
  ['sumac',          { kcal: 313, proteins: 8,   fats: 8.5, carbs: 74  }],
  ['za\'atar',       { kcal: 276, proteins: 9,   fats: 7,   carbs: 64  }],
  // ── Boissons ─────────────────────────────────────────────────────────────
  ['vin blanc',      { kcal: 70,  proteins: 0.1, fats: 0,   carbs: 1   }],
  ['vin rouge',      { kcal: 83,  proteins: 0.1, fats: 0,   carbs: 2.6 }],
  ['vin',            { kcal: 83,  proteins: 0.1, fats: 0,   carbs: 2.6 }],
  ['wine',           { kcal: 83,  proteins: 0.1, fats: 0,   carbs: 2.6 }],
  ['bière',          { kcal: 43,  proteins: 0.5, fats: 0,   carbs: 3.5 }],
  ['beer',           { kcal: 43,  proteins: 0.5, fats: 0,   carbs: 3.5 }],
  ['eau',            { kcal: 0,   proteins: 0,   fats: 0,   carbs: 0   }],
  ['water',          { kcal: 0,   proteins: 0,   fats: 0,   carbs: 0   }],
];

// Sort longest keys first → more specific entries match before generic ones
const LOOKUP = RAW_LOOKUP.sort((a, b) => b[0].length - a[0].length);

function lookupIngredient(name: string): MacroPer100g | null {
  const lower = name.toLowerCase();
  for (const [keyword, values] of LOOKUP) {
    if (lower.includes(keyword)) return values;
  }
  return null;
}

// ─── Unit normalization ──────────────────────────────────────────────────────

const GRAM_UNITS = new Set(['g', 'gr', 'gramme', 'grammes', 'gram', 'grams']);
const ML_UNITS = new Set(['ml', 'millilitre', 'millilitres', 'milliliter']);
const PIECE_UNITS = new Set([
  'pièce', 'pièces', 'piece', 'pieces', 'unité', 'unités',
  'unit', 'units', '', 'tranche', 'tranches', 'feuille', 'feuilles',
  'gousse', 'gousses', 'brin', 'brins', 'bouquet', 'bouquets',
]);
const SPOON_UNITS: Record<string, number> = {
  'cuillère à soupe': 15,
  'cuillères à soupe': 15,
  'c. à soupe': 15,
  'cas': 15,
  'cs': 15,
  'tbsp': 15,
  'cuillère à café': 5,
  'cuillères à café': 5,
  'c. à café': 5,
  'cac': 5,
  'cc': 5,
  'tsp': 5,
};
const KG_UNITS = new Set(['kg', 'kilogramme', 'kilogrammes']);
const LITER_UNITS = new Set(['l', 'litre', 'litres', 'liter']);

function parseQuantityInGrams(
  rawQuantity: string | number | null | undefined,
  rawUnit: string | null | undefined,
): number {
  if (rawQuantity == null && rawUnit == null) return 100;

  const unit = (rawUnit ?? '').trim().toLowerCase();
  let qty: number;

  if (typeof rawQuantity === 'number') {
    qty = rawQuantity;
  } else if (typeof rawQuantity === 'string') {
    const fractionMatch = rawQuantity.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      qty = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    } else {
      const numMatch = rawQuantity.match(/[\d]+([.,]\d+)?/);
      if (!numMatch) return 100;
      qty = parseFloat(numMatch[0].replace(',', '.'));
    }
  } else {
    return 100;
  }

  if (isNaN(qty) || qty <= 0) return 100;

  if (GRAM_UNITS.has(unit)) return qty;
  if (ML_UNITS.has(unit)) return qty;
  if (KG_UNITS.has(unit)) return qty * 1000;
  if (LITER_UNITS.has(unit)) return qty * 1000;
  if (SPOON_UNITS[unit] !== undefined) return qty * SPOON_UNITS[unit];
  if (PIECE_UNITS.has(unit)) return qty * 100;
  if (unit === 'cl') return qty * 10;
  if (!unit) return qty >= 1 ? qty : qty * 100;

  return qty * 100;
}

// ─── Main computation ────────────────────────────────────────────────────────

/**
 * Compute total and per-serving nutrition for a list of recipe ingredients.
 *
 * Priority order for each ingredient:
 *   1. Exact DB match (ingredients table, case-insensitive)
 *   2. Synonym match (ingredient_synonyms table)
 *   3. Keyword lookup from the hardcoded LOOKUP table (substring match)
 *
 * Macro values from the DB are estimated from caloriesPer100g using a
 * balanced 20/30/50 protein/fat/carb ratio. The lookup table stores actual
 * per-100g macro values for more accuracy.
 */
export async function computeNutrition(
  ingredients: RecipeIngredient[],
  servings: number,
): Promise<NutritionResult> {
  const safeServings = Math.max(1, servings);

  let totalKcal = 0;
  let totalProteins = 0;
  let totalFats = 0;
  let totalCarbs = 0;
  let matchedCount = 0;

  const names = ingredients.map((i) => i.name.trim().toLowerCase());

  // 1. Direct DB match
  const directMatches = await prisma.ingredient.findMany({
    where: { name: { in: names, mode: 'insensitive' } },
  });
  const matchedByName = new Map<string, typeof directMatches[0]>();
  for (const ing of directMatches) {
    matchedByName.set(ing.name.toLowerCase(), ing);
  }

  // 2. Synonym DB match for unmatched names
  const unmatchedNames = names.filter((n) => !matchedByName.has(n));
  const synonymMatches = unmatchedNames.length > 0
    ? await prisma.ingredientSynonym.findMany({
        where: { synonym: { in: unmatchedNames, mode: 'insensitive' } },
        include: { ingredient: true },
      })
    : [];
  const matchedBySynonym = new Map<string, typeof directMatches[0]>();
  for (const syn of synonymMatches) {
    matchedBySynonym.set(syn.synonym.toLowerCase(), syn.ingredient);
  }

  // 3. Accumulate macros
  for (const recipeIng of ingredients) {
    const key = recipeIng.name.trim().toLowerCase();
    const grams = parseQuantityInGrams(recipeIng.quantity, recipeIng.unit);
    const factor = grams / 100;

    const dbIng = matchedByName.get(key) ?? matchedBySynonym.get(key);

    let macros: MacroPer100g | null = null;

    if (dbIng && dbIng.caloriesPer100g != null) {
      // DB hit: estimate macros from kcal with generic ratio
      const k = dbIng.caloriesPer100g;
      macros = {
        kcal: k,
        proteins: (k * 0.20) / 4,
        fats: (k * 0.30) / 9,
        carbs: (k * 0.50) / 4,
      };
    } else {
      // Fallback: keyword lookup table
      macros = lookupIngredient(recipeIng.name);
    }

    if (!macros) continue; // truly unrecognised ingredient

    matchedCount++;
    totalKcal += macros.kcal * factor;
    totalProteins += macros.proteins * factor;
    totalFats += macros.fats * factor;
    totalCarbs += macros.carbs * factor;
  }

  return {
    kcal: Math.round(totalKcal),
    proteins: Math.round(totalProteins * 10) / 10,
    fats: Math.round(totalFats * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    perServing: {
      kcal: Math.round(totalKcal / safeServings),
      proteins: Math.round((totalProteins / safeServings) * 10) / 10,
      fats: Math.round((totalFats / safeServings) * 10) / 10,
      carbs: Math.round((totalCarbs / safeServings) * 10) / 10,
    },
    matchedCount,
  };
}
