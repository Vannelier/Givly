"use client";

import { useState } from "react";

/**
 * Une URL affichée avec son bouton « Copier ». Vit dans son propre fichier :
 * la vue admin et l'écran de fin de création s'en servent tous les deux, et
 * l'importer depuis l'un des deux les couplerait pour rien.
 */
export default function CopyLine({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="link-box__value">
      <code>{value}</code>
      <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
