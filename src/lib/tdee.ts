// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfileInput {
  age?: number | null;
  weight?: number | null;   // kg
  height?: number | null;   // cm
  gender?: string | null;   // "male" | "female"
  activityLevel?: string | null;
  goal?: string | null;     // "lose" | "sport" | "cook"
}

export interface TDEEResult {
  tdee: number;           // kcal/jour
  protein: number;        // g/jour
  fat: number;            // g/jour
  carbs: number;          // g/jour
  proteinKcal: number;
  fatKcal: number;
  carbsKcal: number;
}

// ─── Activity multipliers (Mifflin-St Jeor) ────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ─── Macro split by goal ────────────────────────────────────────────────────

const MACRO_SPLITS: Record<string, { protein: number; fat: number; carbs: number }> = {
  lose:  { protein: 0.35, fat: 0.25, carbs: 0.40 },
  sport: { protein: 0.30, fat: 0.25, carbs: 0.45 },
  cook:  { protein: 0.20, fat: 0.30, carbs: 0.50 },
};

// ─── Default result when profile is incomplete ──────────────────────────────

const DEFAULT_RESULT: TDEEResult = {
  tdee: 2000,
  protein: 100,
  fat: 65,
  carbs: 250,
  proteinKcal: 400,
  fatKcal: 585,
  carbsKcal: 1000,
};

// ─── Computation ────────────────────────────────────────────────────────────

/**
 * Compute Total Daily Energy Expenditure and macro targets
 * using the Mifflin-St Jeor equation.
 */
export function computeTDEE(profile: UserProfileInput): TDEEResult {
  const { age, weight, height, gender, activityLevel, goal } = profile;

  // Guard: need all 4 core values
  if (age == null || weight == null || height == null || gender == null) {
    return DEFAULT_RESULT;
  }

  // Mifflin-St Jeor BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel ?? 'moderate'] ?? 1.55;
  const tdee = Math.round(bmr * multiplier);

  // Macro split
  const split = MACRO_SPLITS[goal ?? 'cook'] ?? MACRO_SPLITS.cook;

  const proteinKcal = Math.round(tdee * split.protein);
  const fatKcal = Math.round(tdee * split.fat);
  const carbsKcal = Math.round(tdee * split.carbs);

  return {
    tdee,
    protein: Math.round(proteinKcal / 4),   // 4 kcal per gram of protein
    fat: Math.round(fatKcal / 9),            // 9 kcal per gram of fat
    carbs: Math.round(carbsKcal / 4),        // 4 kcal per gram of carbs
    proteinKcal,
    fatKcal,
    carbsKcal,
  };
}
