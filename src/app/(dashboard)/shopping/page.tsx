'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ShoppingCart, CheckCheck, Loader2, ChevronDown,
  ChefHat, Refrigerator, Trash2,
} from 'lucide-react';
import { useToast, ToastContainer } from '@/app/components/Toast';

// ─── Types ─────────────────────────────────────────────────────────────────

interface RecipeGroupItem { name: string; quantity: string; checked: boolean }
interface RecipeGroup {
  recipeId: string;
  recipeTitle: string;
  recipeImageUrl: string | null;
  items: RecipeGroupItem[];
  collapsed?: boolean;
}
interface FreeItem { name: string; checked: boolean }
interface ShoppingData { recipes: RecipeGroup[]; freeItems: FreeItem[] }

function normalise(raw: unknown): ShoppingData {
  if (Array.isArray(raw)) return { recipes: [], freeItems: raw as FreeItem[] };
  const d = raw as Partial<ShoppingData> | null;
  return { recipes: d?.recipes ?? [], freeItems: d?.freeItems ?? [] };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const [listId, setListId]       = useState<string | null>(null);
  const [recipes, setRecipes]     = useState<RecipeGroup[]>([]);
  const [freeItems, setFreeItems] = useState<FreeItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [validating, setValidating] = useState(false);
  const [freeInput, setFreeInput] = useState('');
  const { toasts, showToast, dismiss } = useToast();

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/shopping-list');
    if (res.ok) {
      const { lists } = await res.json();
      if (lists.length > 0) {
        const l = lists[0];
        setListId(l.id);
        const d = normalise(l.items);
        setRecipes(d.recipes);
        setFreeItems(d.freeItems);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const persist = useCallback(async (newRecipes: RecipeGroup[], newFree: FreeItem[], currentId: string | null) => {
    const items: ShoppingData = { recipes: newRecipes, freeItems: newFree };
    if (currentId) {
      await fetch(`/api/shopping-list/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } else {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ma liste', items }),
      });
      if (res.ok) {
        const { list } = await res.json();
        setListId(list.id);
        return list.id as string;
      }
    }
    return currentId;
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateRecipes = async (next: RecipeGroup[]) => {
    setRecipes(next);
    await persist(next, freeItems, listId);
  };

  const updateFree = async (next: FreeItem[]) => {
    setFreeItems(next);
    await persist(recipes, next, listId);
  };

  // ── Free items ────────────────────────────────────────────────────────────

  const addFreeItem = async () => {
    if (!freeInput.trim()) return;
    const next = [...freeItems, { name: freeInput.trim(), checked: false }];
    setFreeInput('');
    await updateFree(next);
    showToast(`"${freeInput.trim()}" ajouté`, 'success');
  };

  const toggleFree = (i: number) =>
    updateFree(freeItems.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it));

  const deleteFree = (i: number) =>
    updateFree(freeItems.filter((_, idx) => idx !== i));

  // ── Recipe groups ─────────────────────────────────────────────────────────

  const toggleRecipeItem = (rIdx: number, iIdx: number) => {
    const next = recipes.map((r, ri) =>
      ri !== rIdx ? r : { ...r, items: r.items.map((it, ii) => ii === iIdx ? { ...it, checked: !it.checked } : it) }
    );
    updateRecipes(next);
  };

  const deleteRecipeItem = (rIdx: number, iIdx: number) => {
    const next = recipes.map((r, ri) =>
      ri !== rIdx ? r : { ...r, items: r.items.filter((_, ii) => ii !== iIdx) }
    ).filter((r) => r.items.length > 0);
    updateRecipes(next);
  };

  const deleteRecipeGroup = (rIdx: number) => {
    const title = recipes[rIdx]?.recipeTitle;
    updateRecipes(recipes.filter((_, ri) => ri !== rIdx));
    if (title) showToast(`"${title}" retiré de la liste`, 'info');
  };

  const toggleCollapse = (rIdx: number) => {
    setRecipes((prev) => prev.map((r, ri) => ri === rIdx ? { ...r, collapsed: !r.collapsed } : r));
  };

  // ── Validate checked → frigo ──────────────────────────────────────────────

  const checkedNames = [
    ...recipes.flatMap((r) => r.items.filter((i) => i.checked).map((i) => i.name + (i.quantity ? ` — ${i.quantity}` : ''))),
    ...freeItems.filter((i) => i.checked).map((i) => i.name),
  ];
  const totalChecked = checkedNames.length;
  const totalUnchecked =
    recipes.flatMap((r) => r.items).filter((i) => !i.checked).length +
    freeItems.filter((i) => !i.checked).length;

  const validateChecked = async () => {
    if (totalChecked === 0) return;
    setValidating(true);
    try {
      const res = await fetch('/api/pantry/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: checkedNames }),
      });
      if (!res.ok) { showToast('Erreur lors de l\'ajout au frigo', 'error'); return; }

      // Remove checked items
      const newRecipes = recipes
        .map((r) => ({ ...r, items: r.items.filter((i) => !i.checked) }))
        .filter((r) => r.items.length > 0);
      const newFree = freeItems.filter((i) => !i.checked);

      setRecipes(newRecipes);
      setFreeItems(newFree);
      const newId = await persist(newRecipes, newFree, listId);
      if (newId && newId !== listId) setListId(newId);

      showToast(`${totalChecked} article${totalChecked > 1 ? 's' : ''} ajouté${totalChecked > 1 ? 's' : ''} au frigo !`, 'success');
    } finally {
      setValidating(false);
    }
  };

  const clearAllChecked = () => {
    const newRecipes = recipes.map((r) => ({ ...r, items: r.items.filter((i) => !i.checked) })).filter((r) => r.items.length > 0);
    const newFree = freeItems.filter((i) => !i.checked);
    setRecipes(newRecipes);
    setFreeItems(newFree);
    persist(newRecipes, newFree, listId);
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const isEmpty = recipes.length === 0 && freeItems.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5 pb-10">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Liste de courses</p>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            {totalUnchecked} article{totalUnchecked !== 1 ? 's' : ''} restant{totalUnchecked !== 1 ? 's' : ''}
          </h2>
        </div>
        {totalChecked > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={validateChecked}
            disabled={validating}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/25 disabled:opacity-60"
          >
            {validating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Refrigerator className="w-4 h-4" />}
            {validating ? 'Ajout…' : `Mettre au frigo (${totalChecked})`}
          </motion.button>
        )}
      </div>

      {/* ── Free input ── */}
      <div className="flex gap-2">
        <input
          type="text"
          value={freeInput}
          onChange={(e) => setFreeInput(e.target.value)}
          placeholder="Ajouter un article…"
          className="input-base rounded-full flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') addFreeItem(); }}
        />
        <button onClick={addFreeItem} className="btn-primary px-5 rounded-full">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
          <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-8 h-8 text-stone-300" />
          </div>
          <p className="text-stone-500 font-medium mb-1">Votre liste est vide</p>
          <p className="text-stone-400 text-sm">Ajoutez des articles ci-dessus ou depuis une page recette.</p>
        </div>
      )}

      {/* ── Recipe groups ── */}
      {recipes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1">Par recette</p>
          {recipes.map((group, rIdx) => {
            const groupChecked  = group.items.filter((i) => i.checked).length;
            const groupTotal    = group.items.length;
            const isCollapsed   = group.collapsed ?? false;

            return (
              <div key={group.recipeId} className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-canvas-100">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                    {group.recipeImageUrl
                      ? <img src={group.recipeImageUrl} alt={group.recipeTitle} className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full"><ChefHat className="w-5 h-5 text-stone-300" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{group.recipeTitle}</p>
                    <p className="text-xs text-stone-400">
                      {groupChecked}/{groupTotal} coché{groupChecked !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleCollapse(rIdx)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-canvas-100 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                  <button
                    onClick={() => deleteRecipeGroup(rIdx)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>

                {/* Items */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      {group.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          className={`flex items-center gap-3 px-4 py-3 border-b border-canvas-50 last:border-0 group transition-colors ${item.checked ? 'bg-canvas-50' : 'hover:bg-canvas-50'}`}
                        >
                          <button
                            onClick={() => toggleRecipeItem(rIdx, iIdx)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              item.checked
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-stone-300 hover:border-brand-500'
                            }`}
                          >
                            {item.checked && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${item.checked ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                            {item.name}
                            {item.quantity && (
                              <span className="text-stone-400 font-normal"> — {item.quantity}</span>
                            )}
                          </span>
                          <button
                            onClick={() => deleteRecipeItem(rIdx, iIdx)}
                            className="text-stone-300 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Free items ── */}
      {freeItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-1">Articles libres</p>
          <div className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden">
            {freeItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-5 py-3.5 border-b border-canvas-100 last:border-0 group transition-colors ${item.checked ? 'bg-canvas-50' : 'hover:bg-canvas-50'}`}
              >
                <button
                  onClick={() => toggleFree(i)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.checked ? 'bg-brand-500 border-brand-500' : 'border-stone-300 hover:border-brand-500'
                  }`}
                >
                  {item.checked && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm flex-1 ${item.checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => deleteFree(i)}
                  className="text-stone-300 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clear checked ── */}
      {totalChecked > 0 && (
        <div className="flex justify-center">
          <button
            onClick={clearAllChecked}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-red-500 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Effacer les cochés ({totalChecked}) sans ajouter au frigo
          </button>
        </div>
      )}
    </motion.div>
  );
}
