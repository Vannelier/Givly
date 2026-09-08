import type { MotifKind } from "./occasions";

/**
 * Les modèles de carte imprimable.
 *
 * Une liste plate, pas deux sélecteurs à croiser : chaque entrée est une
 * combinaison déjà arbitrée d'une composition et d'un décor. Un carrousel qu'on
 * parcourt à la flèche doit être court, et dix combinaisons choisies valent
 * mieux que vingt-huit engendrées.
 *
 * Comme les palettes et les occasions, seul l'identifiant compte : la palette et
 * la police restent celles du thème de la carte, et tout le rendu vit dans
 * `app/print.css`. Ajouter un modèle coûte une ligne ici et un bloc de style.
 *
 * Aucun import Node : ce module part dans le bundle navigateur.
 */

/** Ce qui change dans la mise en page. Le rendu vit dans `app/print.css`. */
export const PRINT_COMPOSITIONS = ["centre", "cadre", "bandeau", "affiche"] as const;

export type PrintComposition = (typeof PRINT_COMPOSITIONS)[number];

export type PrintModel = {
  id: string;
  nom: string;
  composition: PrintComposition;
  motif: MotifKind;
};

export const PRINT_MODELS: PrintModel[] = [
  { id: "classique", nom: "Classique", composition: "centre", motif: "none" },
  { id: "classique-coeurs", nom: "Cœurs", composition: "centre", motif: "coeurs" },
  { id: "cadre-flocons", nom: "Flocons", composition: "cadre", motif: "flocons" },
  { id: "cadre-etoiles", nom: "Étoiles", composition: "cadre", motif: "etoiles" },
  { id: "cadre-feuilles", nom: "Feuilles", composition: "cadre", motif: "feuilles" },
  { id: "bandeau", nom: "Bandeau", composition: "bandeau", motif: "none" },
  { id: "bandeau-confetti", nom: "Confettis", composition: "bandeau", motif: "confetti" },
  { id: "bandeau-guirlande", nom: "Guirlande", composition: "bandeau", motif: "guirlande" },
  { id: "affiche", nom: "Affiche", composition: "affiche", motif: "none" },
  { id: "affiche-coeurs", nom: "Affiche fleurie", composition: "affiche", motif: "coeurs" },
];

export const DEFAULT_PRINT_MODEL_ID = PRINT_MODELS[0].id;

/** Un identifiant inconnu retombe sur le défaut, jamais sur `undefined`. */
export function printModelById(id: string | undefined | null): PrintModel {
  return PRINT_MODELS.find((m) => m.id === id) ?? PRINT_MODELS[0];
}

/**
 * Le modèle voisin, dans un sens ou dans l'autre. La liste boucle : après le
 * dernier vient le premier.
 *
 * Fonction du modèle courant vers le suivant, et non calcul à partir d'un index
 * mémorisé : c'est ce qui permet au composant d'employer la forme fonctionnelle
 * de `setState`. Sans elle, deux clics rapprochés partaient du même état — la
 * seconde flèche recalculait le voisin de l'ancien modèle, et n'avançait pas.
 */
export function stepPrintModel(id: string | undefined | null, pas: number): string {
  const courant = PRINT_MODELS.findIndex((m) => m.id === printModelById(id).id);
  const total = PRINT_MODELS.length;
  return PRINT_MODELS[(((courant + pas) % total) + total) % total].id;
}
