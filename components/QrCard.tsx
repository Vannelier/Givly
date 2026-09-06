"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Le QR code du lien public, à imprimer et glisser dans une vraie carte.
 *
 * Généré en SVG côté navigateur : ça reste net à n'importe quelle taille
 * d'impression, et ça évite un aller-retour serveur pour une donnée que le
 * client possède déjà.
 */
export default function QrCard({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let vivant = true;
    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#231f1c", light: "#ffffff" },
    })
      .then((out) => {
        if (vivant) setSvg(out);
      })
      .catch(() => {
        if (vivant) setFailed(true);
      });
    return () => {
      vivant = false;
    };
  }, [url]);

  if (failed) {
    return (
      <p className="notice notice--warn">
        Le QR code n&apos;a pas pu être généré. Le lien reste utilisable tel quel.
      </p>
    );
  }

  return (
    <div className="qr">
      <div
        className="qr__code"
        // Sortie d'une bibliothèque de QR, pas une saisie : c'est un SVG que nous
        // venons de produire nous-mêmes à partir de notre propre URL.
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <div className="qr__side">
        <p className="qr__help">
          Imprime-le et glisse-le dans une carte en papier : il suffit de le scanner pour ouvrir la
          page-cadeau.
        </p>
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
  );
}

function telecharger(svg: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "givly-qr.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
