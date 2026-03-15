'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-canvas-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">Quelque chose s&apos;est mal passé</h2>
        <p className="text-stone-500 text-sm mb-6">Une erreur inattendue s&apos;est produite.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Réessayer
          </button>
          <Link href="/feed" className="px-5 py-2.5 bg-canvas-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-canvas-300 transition-colors">
            Retour au feed
          </Link>
        </div>
      </div>
    </div>
  );
}
