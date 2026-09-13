import type { Metadata } from "next";
import Link from "next/link";
import GiftView from "@/components/GiftView";
import { EXEMPLE } from "@/lib/exemple";
import { alt as altBanniere, size as tailleBanniere } from "@/app/opengraph-image";

const DESCRIPTION =
  "Une vraie page-cadeau à essayer : lève le voile, choisis parmi quatre idées, confirme. Rien n'est envoyé.";

export const metadata: Metadata = {
  title: "Exemple de page-cadeau — MyPresentsForYou",
  description: DESCRIPTION,
  alternates: { canonical: "/exemple" },
  /*
   * Un `openGraph` de page remplace celui du layout en entier, sans fusion :
   * type, nom du site et langue y sont repetes. L'exemple se partage — c'est
   * ce qui justifiait une page plutot qu'un apercu — et son titre doit le dire.
   *
   * L'image, en revanche, est citee a la main : des que la page declare son
   * propre openGraph, celle du fichier app/opengraph-image.tsx ne sort plus —
   * mesure dans le HTML servi, aucune og:image. Ses dimensions et son texte
   * alternatif viennent de ce fichier, pour suivre la banniere si elle change.
   */
  openGraph: {
    type: "website",
    siteName: "MyPresentsForYou",
    locale: "fr_BE",
    url: "/exemple",
    title: "Exemple de page-cadeau — MyPresentsForYou",
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: tailleBanniere.width,
        height: tailleBanniere.height,
        alt: altBanniere,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Exemple de page-cadeau — MyPresentsForYou",
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/*
 * Une page-cadeau figee, jouee en mode apercu : on leve le voile, on choisit,
 * on confirme, on ecrit un mot, et rien ne part. `scripts/check.ts` refuse
 * qu'elle quitte ce mode.
 *
 * Le bandeau est celui de l'apercu de l'editeur. Le voile, en position fixe et
 * au-dessus, le recouvre pendant l'ouverture : on arrive ici par un bouton qui
 * dit deja « exemple ». Elle occupe la fenetre, comme une vraie page :
 * `pleineFenetre` lui rend le verrou du defilement sous le voile et la
 * remontee a l'ouverture, que l'editeur tient lui-meme autour de son apercu.
 */
export default function ExemplePage() {
  return (
    <>
      <div className="preview-ribbon">
        Exemple — rien n&apos;est envoyé
        <Link className="preview-ribbon__exit" href="/creer">
          Composer la mienne
        </Link>
      </div>
      <GiftView
        page={EXEMPLE}
        mode="preview"
        pleineFenetre
        lienSortie={{ libelle: "Composer ma page-cadeau", href: "/creer" }}
      />
    </>
  );
}
