import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-bold text-canvas-300 mb-4">404</p>
        <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">Page introuvable</h2>
        <p className="text-stone-500 text-sm mb-6">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
