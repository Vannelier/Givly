"use client";

import { useEffect, useState } from "react";
import GiftMotif from "@/components/GiftMotif";
import type { MotifKind, OpeningId } from "@/lib/occasions";

/**
 * Le voile d'ouverture : ce qu'on voit en arrivant, avant les cadeaux.
 *
 * Volontairement translucide et flouté plutôt que plein — on devine les cartes
 * derrière, ce qui donne envie de l'ouvrir. Il porte son propre décor, puisqu'il
 * masque celui de la page.
 *
 * Le fond est peint par deux panneaux et non par le voile lui-même : c'est ce qui
 * permet au style « rideau » de les écarter indépendamment.
 */
export default function GiftCover({
  to,
  intro,
  title,
  openLabel,
  waitMessage,
  motif,
  style,
  sealedUntil,
  closing,
  onOpen,
}: {
  to: string;
  intro: string;
  title: string;
  /** Texte du bouton d'ouverture. */
  openLabel: string;
  /** Mot d'attente, sous la date. Vide = rien affiche. */
  waitMessage: string;
  motif: MotifKind;
  style: OpeningId;
  sealedUntil: Date | null;
  closing: boolean;
  onOpen: () => void;
}) {
  const remaining = useCountdown(sealedUntil);
  const sealed = remaining !== null;

  return (
    <div
      className={`cover cover--${style}${closing ? " is-closing" : ""}`}
      aria-hidden={closing}
    >
      <span className="cover__panel cover__panel--a" />
      <span className="cover__panel cover__panel--b" />
      {/*
        Le rabat de l'enveloppe. Les deux panneaux ne suffisaient pas : ils
        portent le fond opaque, et l'enveloppe a besoin en plus d'une piece
        triangulaire qui bascule seule. Les autres ouvertures le laissent
        invisible.
      */}
      <span className="cover__flap" />
      <GiftMotif kind={motif} />

      <div className="cover__inner">
        {to && <p className="cover__to">Pour {to}</p>}
        <p className="cover__intro">{intro}</p>
        <h1 className="cover__title">{title}</h1>

        {sealed ? (
          <div className="cover__wait">
            <p className="cover__countdown" aria-live="polite">
              {remaining}
            </p>
            <p className="cover__when">
              À ouvrir le{" "}
              {sealedUntil?.toLocaleDateString("fr-BE", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {waitMessage.trim() && <p className="cover__patience">{waitMessage}</p>}
          </div>
        ) : (
          <button type="button" className="btn cover__btn" onClick={onOpen} autoFocus>
            {openLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Renvoie le temps restant sous forme lisible, ou null une fois l'heure venue.
 * Le compte à rebours n'est qu'un confort : le serveur refuse de toute façon un
 * choix envoyé avant la date.
 */
function useCountdown(until: Date | null): string | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!until) return null;
  // Avant le premier tick, on se fie a la date : evite un ecart serveur/client
  // qui ferait clignoter le bouton au chargement.
  const left = until.getTime() - (now ?? Date.now());
  if (left <= 0) return null;

  const s = Math.floor(left / 1000);
  const jours = Math.floor(s / 86400);
  const heures = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secondes = s % 60;

  if (jours > 0) return `${jours} j ${heures} h`;
  if (heures > 0) return `${heures} h ${pad(minutes)} min`;
  return `${minutes}:${pad(secondes)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
