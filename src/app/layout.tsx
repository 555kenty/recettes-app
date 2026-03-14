import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-cream-50 text-charcoal-800 antialiased">
        <div className="max-w-md mx-auto min-h-screen relative bg-white">
          {children}
        </div>
      </body>
    </html>
  );
}
