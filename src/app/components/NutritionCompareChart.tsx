'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { NutritionResult } from '@/lib/nutrition';

export interface CompareRecipe {
  id: string;
  title: string;
  nutrition: NutritionResult;
}

const RECIPE_COLORS = ['#f97316', '#3b82f6', '#10b981'];

const METRICS = [
  { key: 'kcal' as const, label: 'Calories (kcal)' },
  { key: 'proteins' as const, label: 'Protéines (g)' },
  { key: 'fats' as const, label: 'Lipides (g)' },
  { key: 'carbs' as const, label: 'Glucides (g)' },
];

interface Props {
  recipes: CompareRecipe[];
  perServing?: boolean;
}

export function NutritionCompareChart({ recipes, perServing = true }: Props) {
  if (recipes.length === 0) return null;

  const data = METRICS.map(({ key, label }) => {
    const entry: Record<string, string | number> = { name: label };
    recipes.forEach((r) => {
      const src = perServing ? r.nutrition.perServing : r.nutrition;
      entry[r.id] = src[key];
    });
    return entry;
  });

  const shortTitle = (title: string) =>
    title.length > 22 ? title.slice(0, 21) + '…' : title;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} barGap={4} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e7e5e4',
            borderRadius: 12,
            fontSize: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
          cursor={{ fill: '#f5f5f4' }}
        />
        <Legend
          formatter={(value) => {
            const r = recipes.find((r) => r.id === value);
            return <span style={{ fontSize: 12, color: '#44403c' }}>{r ? shortTitle(r.title) : value}</span>;
          }}
          iconType="circle"
          iconSize={8}
        />
        {recipes.map((r, i) => (
          <Bar
            key={r.id}
            dataKey={r.id}
            name={r.id}
            fill={RECIPE_COLORS[i]}
            radius={[5, 5, 0, 0]}
            maxBarSize={56}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
