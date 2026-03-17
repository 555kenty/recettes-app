'use client';

import { RecipeBrowser } from '@/app/components/RecipeBrowser';

export default function DiscoverPage() {
  return <RecipeBrowser communityOnly={false} pageTitle="Toutes les recettes" />;
}
