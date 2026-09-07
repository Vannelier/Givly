import type { Metadata, Viewport } from "next";
import {
  Caveat,
  Cormorant_Garamond,
  Dancing_Script,
  Fraunces,
  Inter,
  Playfair_Display,
  Quicksand,
} from "next/font/google";
import { baseUrl } from "@/lib/env";
import "./globals.css";
import "./editor.css";
import "./landing.css";
import "./legal.css";

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

const DESCRIPTION =
  "Compose une petite page-cadeau, envoie le lien, laisse la personne choisir.";

/*
 * Les icônes ne sont pas déclarées ici : `app/favicon.ico`, `app/icon.svg` et
 * `app/apple-icon.png` sont détectés par Next, qui pose les balises lui-même.
 * Les redéclarer dans `metadata.icons` remplacerait cette détection au lieu de
 * la compléter. Même chose pour la bannière, prise dans `app/opengraph-image.tsx`.
 *
 * `metadataBase` sert à tout le site : sans elle, l'adresse de la bannière
 * partirait en relatif, et aucune messagerie ne sait quoi en faire.
 *
 * Pas de gabarit de titre (`template`) : le titre d'une page-cadeau est celui
 * que le donneur a écrit, et lui accoler « — Givly » signerait sa carte à sa
 * place dans l'aperçu WhatsApp.
 */
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: "Givly — compose une page-cadeau",
  description: DESCRIPTION,
  applicationName: "Givly",
  openGraph: {
    type: "website",
    siteName: "Givly",
    locale: "fr_BE",
    title: "Givly — offre le choix",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Givly — offre le choix",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#b0533c",
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
