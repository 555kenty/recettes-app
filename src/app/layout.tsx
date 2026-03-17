import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import type { Locale } from "@/i18n";
import { getDirection } from "@/i18n/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CuisineConnect — Votre compagnon culinaire",
  description: "Gérez votre frigo et découvrez des recettes personnalisées parmi 598 recettes du monde entier.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value ?? 'fr') as Locale;
  const dir = getDirection(locale);
  const langMap: Record<Locale, string> = { fr: 'fr', en: 'en', ar: 'ar' };

  return (
    <html lang={langMap[locale]} className={inter.variable} data-dir={dir} data-locale={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-canvas-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
