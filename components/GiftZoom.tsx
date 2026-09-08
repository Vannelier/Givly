"use client";

import { useEffect } from "react";

/**
 * L'image d'un cadeau, en grand.
 *
 * Une vignette de 168 px ne suffit pas à juger d'un bijou : c'est le détail —
 * la pierre, la chaîne, la finition — qui décide du choix. La photo entière,
 * sans recadrage, sur un fond sombre pour qu'elle se détache.
 *
 * Rendue au-dessus de tout, `Escape` et le clic hors de l'image la ferment.
 */
export default function GiftZoom({
  url,
  label,
  onClose,
}: {
  url: string;
  label: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", surTouche);
    // La page derriere ne doit pas defiler pendant qu'on regarde la photo.
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", surTouche);
      document.body.style.overflow = precedent;
    };
  }, [onClose]);

  return (
    <div
      className="zoom"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo : ${label}`}
      onClick={onClose}
    >
      <button type="button" className="zoom__fermer" aria-label="Fermer la photo" onClick={onClose}>
        ×
      </button>

      {/*
        Le clic sur la photo ne ferme pas : on veut pouvoir la regarder sans
        que le moindre geste renvoie a la liste.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="zoom__img"
        src={url}
        alt={label}
        onClick={(e) => e.stopPropagation()}
      />

      <p className="zoom__legende">{label}</p>
    </div>
  );
}
