import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CuisineConnect - Votre compagnon culinaire",
  description: "Gérez votre frigo et découvrez des recettes personnalisées",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50 text-slate-800 antialiased`}>
        <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
