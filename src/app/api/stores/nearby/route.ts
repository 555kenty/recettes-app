import { NextRequest, NextResponse } from 'next/server';

// GET /api/stores/nearby?lat=48.8566&lon=2.3522&radius=2000
// Utilise Geoapify Places API (3000 req/jour gratuit)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') ?? '2000';

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEOAPIFY_API_KEY not configured' }, { status: 503 });
  }

  const categories = 'commercial.supermarket,commercial.food_and_drink,commercial.convenience,commercial.marketplace';
  const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lon},${lat},${radius}&limit=20&apiKey=${apiKey}`;

  let res: Response;
  interface GeoapifyFeature {
    properties: {
      name?: string;
      categories?: string[];
      address_line1?: string;
      address_line2?: string;
      distance?: number;
      opening_hours?: string;
      lon?: number;
      lat?: number;
      place_id?: string;
    };
    geometry?: { coordinates?: [number, number] };
  }
  let data: { features?: GeoapifyFeature[]; message?: string; error?: string };
  try {
    res = await fetch(url);
    data = await res.json();
  } catch (err) {
    return NextResponse.json({ error: 'Fetch failed', detail: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Geoapify error', status: res.status, detail: data?.message ?? data?.error ?? 'unknown' },
      { status: 502 },
    );
  }

  const stores = (data.features ?? []).map((f) => ({
    id: f.properties.place_id,
    name: f.properties.name ?? 'Magasin',
    category: f.properties.categories?.[0] ?? 'supermarket',
    address: [f.properties.address_line1, f.properties.address_line2].filter(Boolean).join(', '),
    distance: f.properties.distance,
    openingHours: f.properties.opening_hours ?? null,
    lat: f.properties.lat,
    lon: f.properties.lon,
  }));

  return NextResponse.json({ stores });
}
