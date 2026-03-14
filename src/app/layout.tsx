import type { Metadata } from "next";
import { DM_Serif_Display, Work_Sans } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cuisine à la Maison — Recettes Faciles",
  description: "Des recettes simples et gourmandes pour cuisiner au quotidien",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSerif.variable} ${workSans.variable}`}>
      <body className="antialiased bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
