import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "./prisma";

const socialProviders: Record<string, unknown> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  // baseURL non hardcodée — BetterAuth détecte l'origine depuis la requête entrante.
  // Nécessaire pour que les URLs de preview Vercel fonctionnent.
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: [
    "http://localhost:3000",
    "https://recettes-nine.vercel.app",
    // Accepte toutes les preview URLs Vercel de ce projet
    "https://*.vercel.app",
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
});
