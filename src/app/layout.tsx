import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import type { Locale } from "@/i18n";
import { getDirection } from "@/i18n/server";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

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
    <html lang={langMap[locale]} className={`${playfair.variable} ${dmSans.variable}`} data-dir={dir} data-locale={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${playfair.variable} ${dmSans.variable} font-sans antialiased bg-canvas-50 text-warm-700`}>
        {children}
      </body>
    </html>
  );
}
