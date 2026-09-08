"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import GiftMotif from "@/components/GiftMotif";
import PrintCarousel from "@/components/PrintCarousel";
import { fontById } from "@/lib/occasions";
import { paletteStyle } from "@/lib/palettes";
import { DEFAULT_PRINT_MODEL_ID, printModelById, stepPrintModel } from "@/lib/printModels";
import type { Theme } from "@/lib/types";

/**
 * Une feuille A4 paysage, pliée en deux : carte A5 portrait.
 *
 * Le panneau droit porte la couverture, le gauche le dos. On rabat le gauche
 * derrière le droit : le pli tombe à gauche, la couverture est devant, et
 * l'intérieur — non imprimé — s'ouvre comme un livre pour un mot écrit à la
 * main.
 *
 * Tout est dessiné en CSS et en SVG : rien à télécharger, et l'impression sort
 * nette à n'importe quelle taille. Les commandes disparaissent à l'impression.
 */
export default function PrintableCard({
  url,
  to,
  intro,
  title,
  signature,
  theme,
  backHref,
}: {
  url: string;
  to: string;
  intro: string;
  title: string;
  signature: string;
  theme: Theme;
  backHref: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_PRINT_MODEL_ID);
  const modele = printModelById(modelId);

  useEffect(() => {
    QRCode.toString(url, {
      type: "svg",
      // La marge vient du CSS : la plage blanche autour du code fait office de
      // zone de silence, et la doubler ici retrecirait le code pour rien.
      margin: 0,
      // Q tolere 25 % de degradation contre 15 % pour M. Sur papier, le code
      // sera plie, manipule, parfois imprime a court d'encre.
      errorCorrectionLevel: "Q",
      color: { dark: "#1b1b1b", light: "#ffffff" },
    })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);

  /*
   * La feuille garde ses dimensions reelles en millimetres — c'est la meme boite
   * qui part a l'impression. A l'ecran, on la reduit pour qu'elle tienne dans la
   * fenetre : le facteur se mesure, il ne se devine pas.
   */
  const cadre = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);

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
    <div className="print-page">
      <div className="print-bar">
        <Link className="btn btn--ghost btn--sm" href={backHref}>
          ← Retour
        </Link>
        <p>
          Feuille A4, pliée en deux. Rabats la moitié gauche derrière la droite : la couverture se
          retrouve devant, le QR code au dos.
        </p>
        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>

      <PrintCarousel
        modelId={modelId}
        onStep={(pas) => setModelId((prev) => stepPrintModel(prev, pas))}
      />

      <div className="feuille-cadre" ref={cadre}>
        <div className={`feuille feuille--${modele.composition}`} style={skin}>
          <span className="feuille__pli feuille__pli--haut" aria-hidden="true" />
          <span className="feuille__pli feuille__pli--bas" aria-hidden="true" />

          {/* Panneau gauche : le dos, visible en retournant la carte. */}
          <div className="feuille__panneau feuille__dos">
            <GiftMotif kind={modele.motif} />
            <div className="feuille__qr">
              {svg ? (
                // SVG produit a l'instant par la bibliotheque, a partir de notre
                // propre URL : rien d'exterieur n'entre dans cette chaine.
                <div dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="feuille__qr-vide" />
              )}
            </div>
            <p className="feuille__cta">Scanne pour ouvrir ta carte</p>
            {signature && <p className="feuille__signature">{signature}</p>}
          </div>

          {/* Panneau droit : la couverture, devant une fois pliee. */}
          <div className="feuille__panneau feuille__couv">
            <GiftMotif kind={modele.motif} />
            {to && <p className="feuille__to">Pour {to}</p>}
            {intro && <p className="feuille__intro">{intro}</p>}
            <h1 className="feuille__titre">{title}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
