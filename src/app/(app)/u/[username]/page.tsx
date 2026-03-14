'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, UserCheck, Users } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { RecipeCard } from '@/app/components/RecipeCard';

interface UserProfile {
  id: string;
  name: string;
  image: string | null;
  createdAt: string;
  profile: {
    bio: string | null;
    isPublic: boolean;
    followersCount: number;
    followingCount: number;
    goal: string | null;
  } | null;
}

const GOAL_LABELS: Record<string, string> = {
  lose: 'Perte de poids',
  sport: 'Sport & Fitness',
  cook: 'Passion cuisine',
};

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: userId } = use(params); // On utilise l'id comme paramètre
  const router = useRouter();
  const { data: session } = useSession();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (!session) { router.push('/login'); return; }
    const method = following ? 'DELETE' : 'POST';
    const res = await fetch(`/api/users/${userId}/follow`, { method });
    if (res.ok) {
      setFollowing(!following);
      setUser((prev) => prev ? {
        ...prev,
        profile: prev.profile ? {
          ...prev.profile,
          followersCount: prev.profile.followersCount + (following ? -1 : 1),
        } : null,
      } : null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-pulse text-slate-400">Chargement...</div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Profil introuvable ou privé</p>
          <button onClick={() => router.back()} className="text-rose-500 hover:underline">Retour</button>
        </div>
      </div>
    );
  }

  const isOwnProfile = session?.user.id === user.id;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <div className="flex items-start gap-5">
            {user.image ? (
              <img src={user.image} alt={user.name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{user.name}</h1>
                  {user.profile?.goal && (
                    <p className="text-rose-500 text-sm font-medium">{GOAL_LABELS[user.profile.goal] ?? user.profile.goal}</p>
                  )}
                </div>
                {!isOwnProfile && (
                  <button
                    onClick={handleFollow}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm transition-colors ${
                      following
                        ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-500'
                        : 'bg-rose-500 text-white hover:bg-rose-600'
                    }`}
                  >
                    {following ? <><UserCheck className="w-4 h-4" /> Abonné</> : <><UserPlus className="w-4 h-4" /> Suivre</>}
                  </button>
                )}
              </div>

              {user.profile?.bio && <p className="text-slate-600 mt-2 text-sm">{user.profile.bio}</p>}

              <div className="flex gap-6 mt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-800">{user.profile?.followersCount ?? 0}</span>
                  <span className="text-slate-500">abonnés</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-slate-800">{user.profile?.followingCount ?? 0}</span>
                  <span className="text-slate-500">abonnements</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-slate-400">Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recettes */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Recettes publiées</h2>
        {recipes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p>Aucune recette publiée</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((r: never) => <RecipeCard key={(r as { id: string }).id} recipe={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
