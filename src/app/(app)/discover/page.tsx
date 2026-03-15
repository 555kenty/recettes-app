'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { AppSidebar, AppMobileNav } from '@/app/components/AppNav';
import { RecipeBrowser } from '@/app/components/RecipeBrowser';

const GOALS: Record<string, string> = {
  lose: 'Manger sain',
  sport: 'Objectif sport',
  cook: 'Cuisiner & partager',
};

function StandaloneHeader() {
  return (
    <div className="bg-white border-b border-canvas-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <Link href="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline font-semibold text-stone-900 text-sm">Cuisine<span className="text-brand-500">Connect</span></span>
          </Link>
          <div className="flex-1" />
          <Link href="/login" className="text-stone-500 hover:text-stone-800 text-sm font-medium transition-colors px-3 py-1.5">Se connecter</Link>
          <Link href="/register" className="btn-primary text-sm px-4 py-2">Commencer</Link>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const { data: session, isPending } = useSession();
  const [goalLabel, setGoalLabel] = useState('');

  useEffect(() => {
    if (!session) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.user?.profile?.goal) setGoalLabel(GOALS[data.user.profile.goal] ?? ''); })
      .catch(() => {});
  }, [session]);

  if (!isPending && session) {
    return (
      <div className="min-h-screen bg-canvas-50">
        <div className="flex">
          <AppSidebar userName={session.user.name ?? 'Chef'} goalLabel={goalLabel} />
          <div className="flex-1 min-w-0 pb-20 lg:pb-0">
            <RecipeBrowser communityOnly={false} pageTitle="Toutes les recettes" />
          </div>
          <AppMobileNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-50">
      <StandaloneHeader />
      <RecipeBrowser communityOnly={false} pageTitle="Toutes les recettes" />
    </div>
  );
}
