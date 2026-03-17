'use client';

import { RecipeBrowser } from '@/app/components/RecipeBrowser';

export default function FeedPage() {
  return <RecipeBrowser communityOnly={true} pageTitle="Recettes de la communauté" />;
}
