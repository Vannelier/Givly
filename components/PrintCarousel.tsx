"use client";

import { useEffect } from "react";
import GiftMotif from "@/components/GiftMotif";
import type { MotifKind } from "@/lib/occasions";
import { PRINT_MOTIFS, printMotifIndex } from "@/lib/printModels";

/**
 * Les flèches qui font défiler le pictogramme de fond.
 *
 * Elles faisaient défiler des modèles entiers — une disposition et un décor
 * changeant ensemble, sans qu'on puisse dire lequel on voulait. Elles ne
 * s'occupent plus que du décor ; la disposition a sa propre rangée à côté.
 *
 * Séparé de la carte : ça ne dessine rien de ce qui s'imprime, et ça disparaît
 * au moment de l'impression. Le choix n'est pas enregistré — il vit dans l'état
 * de la page. Le persister demanderait une colonne, une migration et une règle
 * de validation, pour un geste qu'on fait une fois.
 *
 * Le composant annonce une direction, pas un identifiant : c'est le parent qui
 * calcule le voisin, en forme fonctionnelle, pour que deux clics rapprochés
 * avancent bien de deux.
 */
export default function PrintCarousel({
  motif,
  onStep,
}: {
  motif: MotifKind;
  onStep: (pas: number) => void;
}) {
  const index = printMotifIndex(motif);

  /*
   * Les fleches du clavier font la meme chose que les boutons — sauf quand on
   * est en train d'ecrire. Les mots de la carte se modifient sur cette page, et
   * une capture globale volait la fleche gauche au curseur du champ.
   */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const saisie = cible?.closest("input, textarea, [contenteditable]");
      if (saisie) return;
      if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onStep]);

  return (
    <div className="carrousel">
      <button
        type="button"
        className="carrousel__fleche"
        aria-label="Pictogramme précédent"
        onClick={() => onStep(-1)}
      >
        ←
      </button>

      {/*
        Une vignette du motif lui-meme, pas seulement son nom : « Guirlande » et
        « Confettis » ne se distinguent qu'une fois vus, et la carte est trop
        grande pour qu'on percoive le changement d'un coup d'oeil sur le fond.
      */}
      {/*
        Vignette et texte cote a cote, et non l'une au-dessus de l'autre : empile,
        ce bloc faisait 89 px, le plus haut des cinq reglages, pour une image de
        40 px et deux lignes de texte.
      */}
      <p className="carrousel__nom" aria-live="polite">
        <span className="carrousel__vignette" aria-hidden="true">
          <GiftMotif kind={PRINT_MOTIFS[index].id} echelle={0.3} />
        </span>
        <span className="carrousel__texte">
          {PRINT_MOTIFS[index].nom}
          <span className="carrousel__rang">
            {index + 1} / {PRINT_MOTIFS.length}
          </span>
        </span>
      </p>

      <button
        type="button"
        className="carrousel__fleche"
        aria-label="Pictogramme suivant"
        onClick={() => onStep(1)}
      >
        →
      </button>
    </div>
  );
}
