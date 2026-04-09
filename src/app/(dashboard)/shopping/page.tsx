'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, X, ShoppingCart, CheckCheck, Loader2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ShoppingItem {
  name: string;
  checked: boolean;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingListId, setShoppingListId] = useState<string | null>(null);
  const [shoppingInput, setShoppingInput] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Load ─────────────────────────────────────────────────────────────────

  const loadShoppingList = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/shopping-list');
    if (res.ok) {
      const { lists } = await res.json();
      if (lists.length > 0) {
        setShoppingListId(lists[0].id);
        setShoppingItems(lists[0].items ?? []);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const saveShoppingList = async (items: ShoppingItem[]) => {
    if (shoppingListId) {
      await fetch(`/api/shopping-list/${shoppingListId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } else {
      const res = await fetch('/api/shopping-list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ma liste', items }),
      });
      if (res.ok) { const { list } = await res.json(); setShoppingListId(list.id); }
    }
    setShoppingItems(items);
  };

  const addToShoppingList = async (name: string) => {
    if (!name.trim()) return;
    await saveShoppingList([...shoppingItems, { name: name.trim(), checked: false }]);
    setShoppingInput('');
  };

  const toggleShoppingItem = async (i: number) => {
    await saveShoppingList(shoppingItems.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it));
  };

  const clearChecked = async () => {
    await saveShoppingList(shoppingItems.filter((it) => !it.checked));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1">Liste de courses</p>
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            {shoppingItems.filter((i) => !i.checked).length} article{shoppingItems.filter((i) => !i.checked).length !== 1 ? 's' : ''} restant{shoppingItems.filter((i) => !i.checked).length !== 1 ? 's' : ''}
          </h2>
        </div>
        {checkedCount > 0 && (
          <button onClick={clearChecked} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-500 transition-colors">
            <CheckCheck className="w-4 h-4" /> Effacer cochés ({checkedCount})
          </button>
        )}
      </div>

      {/* Input ajout */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={shoppingInput}
          onChange={(e) => setShoppingInput(e.target.value)}
          placeholder="Ajouter un article..."
          className="input-base rounded-full flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') addToShoppingList(shoppingInput); }}
        />
        <button onClick={() => addToShoppingList(shoppingInput)} className="btn-primary px-5">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {shoppingItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-canvas-200 shadow-card">
          <div className="w-16 h-16 bg-canvas-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-8 h-8 text-stone-300" />
          </div>
          <p className="text-stone-500">Votre liste est vide.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-canvas-200 shadow-card overflow-hidden">
          {/* Non cochés */}
          {shoppingItems.filter(i => !i.checked).map((item) => {
            const realIdx = shoppingItems.indexOf(item);
            return (
              <div key={realIdx} className="flex items-center gap-4 px-5 py-3.5 border-b border-canvas-100 last:border-0 hover:bg-canvas-50 transition-colors group">
                <button
                  onClick={() => toggleShoppingItem(realIdx)}
                  className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-brand-500 flex-shrink-0 transition-colors"
                />
                <span className="text-stone-800 text-sm flex-1">{item.name}</span>
                <button
                  onClick={() => saveShoppingList(shoppingItems.filter((_, idx) => idx !== realIdx))}
                  className="text-stone-300 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {/* Cochés */}
          {shoppingItems.filter(i => i.checked).map((item) => {
            const realIdx = shoppingItems.indexOf(item);
            return (
              <div key={realIdx} className="flex items-center gap-4 px-5 py-3 border-b border-canvas-100 last:border-0 bg-canvas-50 opacity-50 group">
                <button
                  onClick={() => toggleShoppingItem(realIdx)}
                  className="w-5 h-5 rounded-full bg-brand-500 border-2 border-brand-500 flex-shrink-0 flex items-center justify-center"
                >
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-stone-500 text-sm line-through flex-1">{item.name}</span>
                <button
                  onClick={() => saveShoppingList(shoppingItems.filter((_, idx) => idx !== realIdx))}
                  className="text-stone-300 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
