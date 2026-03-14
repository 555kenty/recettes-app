'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Link2, Loader2, Youtube, CheckCircle2 } from 'lucide-react';

const EXAMPLES = [
  'https://www.youtube.com/watch?v=...',
  'https://www.tiktok.com/@chef/video/...',
  'https://www.instagram.com/reels/...',
];

export default function ImportUrlPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ recipeId: string; title: string } | null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de l\'import');
      } else {
        setResult({ recipeId: data.recipe.id, title: data.recipe.title });
      }
    } catch {
      setError('Erreur réseau, réessayez.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Importer depuis une vidéo</h1>
          <p className="text-slate-500 text-sm">
            Collez l&apos;URL d&apos;une vidéo culinaire YouTube, TikTok ou Instagram.
            L&apos;IA extrait automatiquement la recette.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          {/* Icônes plateformes */}
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <div className="flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-red-500" />
              YouTube
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-slate-400" />
              TikTok
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-slate-400" />
              Instagram Reels
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL de la vidéo</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-400 focus:outline-none disabled:opacity-60 transition-colors"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {result ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800">{result.title}</p>
                <p className="text-sm text-slate-500 mt-1">Recette importée avec succès !</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/recipes/${result.recipeId}`)}
                  className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  Voir la recette
                </button>
                <button
                  onClick={() => { setUrl(''); setResult(null); }}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Importer une autre
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleImport}
              disabled={!url.trim() || loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white py-3.5 rounded-xl font-semibold disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyse en cours... (peut prendre 1-2 min)
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  Extraire la recette
                </>
              )}
            </button>
          )}
        </div>

        {!result && (
          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">Comment ça marche</p>
            <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
              <li>L&apos;audio de la vidéo est extrait et transcrit</li>
              <li>L&apos;IA analyse la transcription et identifie les ingrédients et étapes</li>
              <li>La recette est sauvegardée en mode privé dans votre compte</li>
              <li>Vous pouvez ensuite la modifier et la publier</li>
            </ol>
            <p className="text-xs text-amber-600 mt-3">
              Nécessite <code className="bg-amber-100 px-1 rounded">yt-dlp</code> installé sur le serveur.
              Fonctionne avec les vidéos publiques uniquement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
