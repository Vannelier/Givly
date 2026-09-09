"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import GiftMotif from "@/components/GiftMotif";
import { fontById, occasionById } from "@/lib/occasions";
import { paletteStyle } from "@/lib/palettes";
import { CTA_DEFAUT } from "@/lib/printTexts";
import type { Theme } from "@/lib/types";

/**
 * L'aperçu de la carte à imprimer, avec ses deux gestes en dessous.
 *
 * Il remplace le bloc QR code, qui montrait un damier noir et blanc de la
 * largeur de la page. Ce damier ne dit rien de ce qu'on va tenir dans la main :
 * il ne montre ni le prénom, ni le thème, ni le fait qu'il existe une carte
 * derrière. Ici on voit la feuille telle qu'elle sortira — le dos avec son QR à
 * gauche, la couverture à droite — et le QR reste téléchargeable pour qui veut
 * seulement le coller ailleurs.
 *
 * Volontairement sans réglages : c'est un aperçu, pas l'atelier. « Carte à
 * imprimer » mène à celui-ci, où l'on choisit disposition, pictogramme et
 * couleur.
 */
export default function CardPreview({
  url,
  to,
  intro,
  title,
  signature,
  theme,
  printHref,
}: {
  url: string;
  to: string;
  intro: string;
  title: string;
  signature: string;
  theme: Theme;
  /** Vers l'atelier d'impression. Chemin interne ou adresse absolue. */
  printHref: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [rate, setRate] = useState(false);
  const motif = occasionById(theme.occasion).motif;

  useEffect(() => {
    let vivant = true;
    QRCode.toString(url, {
      type: "svg",
      margin: 0,
      // Q tolere 25 % de degradation : le code reste lisible imprime, plie,
      // manipule, parfois imprime a court d'encre.
      errorCorrectionLevel: "Q",
      color: { dark: "#1b1b1b", light: "#ffffff" },
    })
      .then((out) => vivant && setSvg(out))
      .catch(() => vivant && setRate(true));
    return () => {
      vivant = false;
    };
  }, [url]);

  /*
   * La feuille garde ses dimensions reelles en millimetres — c'est la meme boite
   * qui part a l'impression, donc l'apercu ne peut pas mentir sur les
   * proportions. A l'ecran on la reduit pour tenir dans son cadre : le facteur
   * se mesure, il ne se devine pas.
   */
  const cadre = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const mesurer = () => {
      const feuille = el.querySelector<HTMLElement>(".feuille");
      if (!feuille) return;
      // `offsetWidth` ignore le transform deja applique : c'est la largeur reelle.
      setZoom(el.clientWidth / feuille.offsetWidth);
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  const skin = {
    ...paletteStyle(theme.palette),
    "--font-title": fontById(theme.font).cssVar,
    "--zoom": zoom,
  } as React.CSSProperties;

  return (
    <div className="carte-apercu">
      <div className="carte-apercu__scene" ref={cadre}>
        <div className="feuille feuille--centre feuille--apercu" style={skin} aria-hidden="true">
          {/* Un seul decor pour la feuille entiere : voir `PrintableCard`. */}
          <GiftMotif kind={motif} />

          <span className="feuille__pli feuille__pli--haut" />
          <span className="feuille__pli feuille__pli--bas" />

          <div className="feuille__panneau feuille__dos">
            <div className="feuille__qr">
              {svg ? (
                // SVG produit a l'instant par la bibliotheque, a partir de notre
                // propre URL : rien d'exterieur n'entre dans cette chaine.
                <div dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="feuille__qr-vide" />
              )}
            </div>
            <p className="feuille__cta">{CTA_DEFAUT}</p>
            {signature.trim() && <p className="feuille__signature">{signature}</p>}
          </div>

          <div className="feuille__panneau feuille__couv">
            {to.trim() && <p className="feuille__to">Pour {to}</p>}
            {intro.trim() && <p className="feuille__intro">{intro}</p>}
            <h2 className="feuille__titre">{title}</h2>
          </div>
        </div>
      </div>

      <div className="carte-apercu__cote">
        {/*
          La feuille est marquee `aria-hidden` : c'est une image du meme texte que
          celui de la page, et le relire deux fois n'apprend rien. Une legende la
          decrit a la place.
        */}
        <p className="carte-apercu__legende">
          Une feuille A4 pliée en deux : la couverture devant, le QR code au dos.
        </p>

        <div className="carte-apercu__actions">
          <Link className="btn btn--sm" href={printHref}>
            Carte à imprimer
          </Link>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={!svg}
            onClick={() => svg && telecharger(svg)}
          >
            Télécharger le QR code
          </button>
        </div>
      </div>

      {rate && (
        <p className="notice notice--warn carte-apercu__alerte">
          Le QR code n&apos;a pas pu être généré. Le lien reste utilisable tel quel.
        </p>
      )}

      {!isOpenableUrl(url) && (
        <p className="notice notice--warn carte-apercu__alerte">
          Ce lien pointe vers une adresse locale : les téléphones l&apos;affichent sans pouvoir
          l&apos;ouvrir. Renseigne <code>NEXT_PUBLIC_BASE_URL</code> avec l&apos;adresse publique du
          site.
        </p>
      )}
    </div>
  );
}

/**
 * Une adresse qu'un appareil photo de téléphone acceptera d'ouvrir : http(s) et
 * un hôte qui n'est pas la machine du donneur.
 */
function isOpenableUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]" && host.includes(".");
  } catch {
    return false;
  }
}

function telecharger(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "mypresentsforyou-qr.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
