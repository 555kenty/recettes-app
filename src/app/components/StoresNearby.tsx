'use client';

import { useState } from 'react';
import { MapPin, Loader2, Navigation, Clock, Store, ChevronDown, ChevronUp } from 'lucide-react';

interface StoreResult {
  id: string;
  name: string;
  category: string;
  address: string;
  distance: number;
  openingHours: string | null;
  lat: number;
  lon: number;
}

interface StoresNearbyProps {
  missingIngredients?: string[];
}

export function StoresNearby({ missingIngredients = [] }: StoresNearbyProps) {
  const [stores, setStores] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [located, setLocated] = useState(false);

  const findStores = () => {
    setOpen(true);
    if (located) return;

    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par ce navigateur.');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(`/api/stores/nearby?lat=${latitude}&lon=${longitude}&radius=2000`);

        if (!res.ok) {
          setError('Erreur lors de la recherche de magasins.');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setStores(data.stores ?? []);
        setLocated(true);
        setLoading(false);
      },
      (err) => {
        setError('Impossible d\'obtenir votre position. Vérifiez les permissions.');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const formatDistance = (m: number) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

  const CATEGORY_LABELS: Record<string, string> = {
    'commercial.supermarket': 'Supermarché',
    'commercial.grocery': 'Épicerie',
    'commercial.food_and_drink': 'Alimentation',
  };

  return (
    <div className="mt-8 border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={findStores}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800">Trouver en magasin</p>
            {missingIngredients.length > 0 && (
              <p className="text-xs text-slate-400">
                {missingIngredients.slice(0, 3).join(', ')}{missingIngredients.length > 3 ? ` +${missingIngredients.length - 3}` : ''}
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          {loading && (
            <div className="flex items-center gap-3 text-slate-500 py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Recherche des magasins proches...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm py-3">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && stores.length === 0 && located && (
            <p className="text-slate-400 text-sm py-3 text-center">Aucun magasin trouvé dans un rayon de 2 km.</p>
          )}

          {stores.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {stores.length} magasin{stores.length > 1 ? 's' : ''} dans un rayon de 2 km
              </p>
              {stores.map((store) => (
                <a
                  key={store.id}
                  href={`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Navigation className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{store.name}</p>
                    <p className="text-xs text-slate-400 truncate">{store.address}</p>
                    {store.openingHours && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {store.openingHours}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">{formatDistance(store.distance)}</span>
                    <p className="text-xs text-slate-400">{CATEGORY_LABELS[store.category] ?? 'Magasin'}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
