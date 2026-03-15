import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Pas de baseURL hardcodée — utilise l'origine courante automatiquement.
  // Ça fonctionne sur localhost, la prod ET les URLs de preview Vercel.
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
