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
  // Un appareil photo n'ouvre un lien que s'il en reconnaît un : il lui faut une
  // adresse absolue, sur un hôte réellement joignable. Encodé depuis un serveur
  // de développement, le contenu du QR est du texte que le téléphone se contente
  // d'afficher — d'où le « copier-coller dans le navigateur ».
  const openable = isOpenableUrl(url);

  useEffect(() => {
    let vivant = true;
    QRCode.toString(url, {
      type: "svg",
      // Zone de silence de 4 modules : c'est ce qu'exige la norme. À 1, beaucoup
      // d'appareils photo décodent mal et n'affichent pas la pastille « ouvrir ».
      margin: 4,
      // Q tolère 25 % de dégradation : le QR reste lisible imprimé, plié ou glissé
      // derrière une carte.
      errorCorrectionLevel: "Q",
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
        {!openable && (
          <p className="notice notice--warn" style={{ marginBottom: "0.6rem" }}>
            Ce lien pointe vers une adresse locale : les téléphones l&apos;affichent sans pouvoir
            l&apos;ouvrir. Renseigne <code>NEXT_PUBLIC_BASE_URL</code> avec l&apos;adresse publique du
            site.
          </p>
        )}
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
  a.download = "givly-qr.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
