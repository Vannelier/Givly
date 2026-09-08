"use client";

import { useEffect } from "react";
import { PRINT_MODELS, printModelById } from "@/lib/printModels";

/**
 * Les flèches qui font défiler les modèles de carte.
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
  modelId,
  onStep,
}: {
  modelId: string;
  onStep: (pas: number) => void;
}) {
  const index = PRINT_MODELS.findIndex((m) => m.id === printModelById(modelId).id);

  /*
   * Les fleches du clavier font la meme chose que les boutons. Aucun champ de
   * saisie sur cette page, donc rien a proteger d'une capture globale.
   */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
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
        aria-label="Modèle précédent"
        onClick={() => onStep(-1)}
      >
        ←
      </button>

      <p className="carrousel__nom" aria-live="polite">
        {PRINT_MODELS[index].nom}
        <span>
          {index + 1} / {PRINT_MODELS.length}
        </span>
      </p>

      <button
        type="button"
        className="carrousel__fleche"
        aria-label="Modèle suivant"
        onClick={() => onStep(1)}
      >
        →
      </button>
    </div>
  );
}
