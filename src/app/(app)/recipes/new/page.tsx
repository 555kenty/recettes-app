'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Loader2, Eye, EyeOff, ImagePlus, X } from 'lucide-react';

interface IngredientRow { name: string; quantity: string; unit: string }
interface StepRow { description: string }

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile'];
const CUISINES = ['Française', 'Italian', 'American', 'Japanese', 'Indian', 'Mexican', 'Thai', 'Jamaican', 'Spanish', 'Chinese', 'Moroccan', 'Autre'];

export default function NewRecipePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [category, setCategory] = useState('Plat principal');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [difficulty, setDifficulty] = useState('Moyen');
  const [servings, setServings] = useState('4');
  const [calories, setCalories] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState('');

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: '', quantity: '', unit: '' },
  ]);
  const [steps, setSteps] = useState<StepRow[]>([{ description: '' }]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // ── Ingrédients ────────────────────────────────────────────────────────────

  const addIngredient = () => setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }]);
  const removeIngredient = (i: number) => setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof IngredientRow, value: string) =>
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));

  // ── Étapes ─────────────────────────────────────────────────────────────────

  const addStep = () => setSteps((prev) => [...prev, { description: '' }]);
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));
  const updateStep = (i: number, value: string) =>
    setSteps((prev) => prev.map((s, idx) => idx === i ? { description: value } : s));

  // ── Soumission ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError('');

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      cuisineType: cuisineType || null,
      category,
      timeMinutes: timeMinutes ? parseInt(timeMinutes) : null,
      difficulty,
      servings: servings ? parseInt(servings) : null,
      calories: calories ? parseInt(calories) : null,
      isPublic,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.description.trim()).map((s, i) => ({
        order: i + 1,
        description: s.description.trim(),
        duration_minutes: null,
        tip: null,
      })),
      language: 'fr',
    };

    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const { recipe } = await res.json();

      // Upload image si fournie
      if (imageFile) {
        const imgForm = new FormData();
        imgForm.append('file', imageFile);
        imgForm.append('recipeId', recipe.id);
        await fetch('/api/recipes/upload-image', { method: 'POST', body: imgForm });
      }

      router.push(`/recipes/${recipe.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Erreur lors de la création');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Nouvelle recette</h1>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
          >
            {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isPublic ? 'Publique' : 'Privée'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Infos générales */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
            <h2 className="font-bold text-slate-700">Informations générales</h2>

            {/* Upload image */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Photo de la recette</label>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video">
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-rose-300 hover:bg-rose-50 transition-colors">
                    <ImagePlus className="w-8 h-8 text-slate-300" />
                    <span className="text-sm text-slate-400">Cliquer pour ajouter une photo</span>
                  </div>
                )}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Poulet Yassa sénégalais"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Un plat savoureux aux saveurs citronnées..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cuisine</label>
                <select value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none bg-white">
                  <option value="">Non spécifiée</option>
                  {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulté</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none bg-white">
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temps (min)</label>
                <input type="number" value={timeMinutes} onChange={(e) => setTimeMinutes(e.target.value)} placeholder="30" min="1" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Portions</label>
                <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" min="1" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tags (séparés par des virgules)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="healthy, rapide, vegetarien" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none" />
            </div>
          </div>

          {/* Ingrédients */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <h2 className="font-bold text-slate-700 mb-4">Ingrédients</h2>
            <div className="space-y-3">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                    placeholder="Ingrédient"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                    placeholder="Qté"
                    className="w-20 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                    placeholder="Unité"
                    className="w-20 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none text-sm"
                  />
                  {ingredients.length > 1 && (
                    <button type="button" onClick={() => removeIngredient(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addIngredient} className="mt-3 flex items-center gap-1 text-rose-500 text-sm hover:text-rose-600 transition-colors">
              <Plus className="w-4 h-4" /> Ajouter un ingrédient
            </button>
          </div>

          {/* Étapes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <h2 className="font-bold text-slate-700 mb-4">Étapes de préparation</h2>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2.5">
                    {i + 1}
                  </div>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Étape ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none text-sm resize-none"
                  />
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="text-slate-300 hover:text-red-400 transition-colors mt-2.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="mt-3 flex items-center gap-1 text-rose-500 text-sm hover:text-rose-600 transition-colors">
              <Plus className="w-4 h-4" /> Ajouter une étape
            </button>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {saving ? 'Création...' : 'Publier la recette'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
