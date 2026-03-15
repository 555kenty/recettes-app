import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_APP_URL;
console.log('BetterAuth baseURL:', baseURL);

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
