import type { Metadata } from "next";
import {
  Caveat,
  Cormorant_Garamond,
  Dancing_Script,
  Fraunces,
  Inter,
  Playfair_Display,
  Quicksand,
} from "next/font/google";
import "./globals.css";
import "./editor.css";
import "./landing.css";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/*
 * Polices proposees pour le titre des pages-cadeau.
 *
 * `preload: false` sur celles-ci : seules deux d'entre elles servent au chrome de
 * l'outil, precharger les cinq autres sur chaque page couterait plus qu'il ne
 * rapporte. Le navigateur ne telecharge une police que si une page l'utilise.
 */
const script = Caveat({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-script",
});

const classic = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-classic",
});

const delicate = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--font-delicate",
});

const round = Quicksand({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-round",
});

const calligraphy = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-calligraphy",
});

export const metadata: Metadata = {
  title: "Givly — compose une page-cadeau",
  description: "Compose une petite page-cadeau, envoie le lien, laisse la personne choisir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={[
        display.variable,
        sans.variable,
        script.variable,
        classic.variable,
        delicate.variable,
        round.variable,
        calligraphy.variable,
      ].join(" ")}>
      <body>{children}</body>
    </html>
  );
}
