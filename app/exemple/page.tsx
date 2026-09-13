import type { Metadata } from "next";
import Link from "next/link";
import GiftView from "@/components/GiftView";
import { EXEMPLE } from "@/lib/exemple";

export const metadata: Metadata = {
  title: "Exemple de page-cadeau — MyPresentsForYou",
  description:
    "Une vraie page-cadeau à essayer : lève le voile, choisis parmi quatre idées, confirme. Rien n'est envoyé.",
  alternates: { canonical: "/exemple" },
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
