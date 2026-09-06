"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import GiftMotif from "@/components/GiftMotif";
import { fontById, occasionById } from "@/lib/occasions";
import { paletteStyle } from "@/lib/palettes";
import type { Theme } from "@/lib/types";

/**
 * Une carte au format A6, aux couleurs de la page, avec son QR code.
 *
 * Tout est dessiné en CSS et en SVG : rien à télécharger, et l'impression sort
 * nette à n'importe quelle taille. Les commandes autour disparaissent à
 * l'impression (voir `@media print`), il ne reste que la carte.
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

  useEffect(() => {
    QRCode.toString(url, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#1b1b1b", light: "#ffffff" },
    })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);

  const skin = {
    ...paletteStyle(theme.palette),
    "--font-title": fontById(theme.font).cssVar,
  } as React.CSSProperties;
  const motif = theme.motif === false ? "none" : occasionById(theme.occasion).motif;

  return (
    <div className="print-page">
      <div className="print-bar">
        <Link className="btn btn--ghost btn--sm" href={backHref}>
          ← Retour
        </Link>
        <p>
          Format A6. Imprime, plie en deux, glisse dans une enveloppe — il n&apos;y a plus qu&apos;à
          scanner.
        </p>
        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>

      <div className="card-print" style={skin}>
        <GiftMotif kind={motif} />
        <div className="card-print__inner">
          {to && <p className="card-print__to">Pour {to}</p>}
          <p className="card-print__intro">{intro}</p>
          <h1 className="card-print__title">{title}</h1>

          <div className="card-print__qr">
            {svg ? (
              // SVG produit a l'instant par la bibliotheque, a partir de notre propre URL.
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="card-print__qr-empty" />
            )}
          </div>

          <p className="card-print__cta">Scanne pour ouvrir ta carte</p>
          {signature && <p className="card-print__signature">{signature}</p>}
        </div>
      </div>
    </div>
  );
}
