import type { MotifKind } from "./occasions";

/**
 * De quoi habiller la carte imprimable.
 *
 * Deux axes indépendants, et non une liste de combinaisons figées. La liste
 * plate d'avant croisait une composition et un décor : dix entrées pour quatre
 * dispositions et six motifs, donc l'immense majorité des croisements
 * inatteignables, et une flèche qui changeait les deux à la fois sans qu'on
 * puisse dire lequel on voulait. Séparés, sept motifs et trois dispositions
 * donnent trente-six cartes au lieu de dix, et chacune se règle encore en taille,
 * en contraste et en couleur.
 *
 * Deux compositions sont tombées en chemin. « Bandeau » d'abord : son aplat
 * d'accent était posé en `::before` sans contexte d'empilement, il passait
 * derrière le titre qu'il était censé souligner. « Encadrée » ensuite, sur
 * demande — son filet intérieur n'apportait rien que le décor de fond ne fasse
 * mieux, maintenant qu'on en règle la taille et le contraste.
 *
 * Comme les palettes et les occasions, seul l'identifiant compte : le rendu vit
 * dans `app/print.css`. Ajouter une disposition coûte une ligne ici et un bloc
 * de style ; ajouter un motif ne coûte qu'une ligne, `GiftMotif` sachant déjà
 * les dessiner tous.
 *
 * Aucun import Node : ce module part dans le bundle navigateur.
 */

/* --- La disposition : où tombent le titre, le mot et le QR ----------------- */

export const PRINT_LAYOUTS = [
  { id: "centre", nom: "Classique" },
  { id: "affiche", nom: "Affiche" },
  { id: "sobre", nom: "Sobre" },
] as const;

export type PrintLayout = (typeof PRINT_LAYOUTS)[number]["id"];

export const DEFAULT_PRINT_LAYOUT: PrintLayout = PRINT_LAYOUTS[0].id;

/** Un identifiant inconnu retombe sur le défaut, jamais sur `undefined`. */
export function printLayoutById(id: string | undefined | null): (typeof PRINT_LAYOUTS)[number] {
  return PRINT_LAYOUTS.find((l) => l.id === id) ?? PRINT_LAYOUTS[0];
}

/* --- Le pictogramme de fond ------------------------------------------------ */

/**
 * Les mêmes motifs que la page-cadeau, dans l'ordre où on les fait défiler.
 *
 * « Aucun » ouvre la marche : c'est le défaut, et c'est ce qu'on veut voir en
 * premier — une carte nue avant d'y semer quoi que ce soit.
 */
export const PRINT_MOTIFS: { id: MotifKind; nom: string }[] = [
  { id: "none", nom: "Aucun" },
  { id: "coeurs", nom: "Cœurs" },
  { id: "etoiles", nom: "Étoiles" },
  { id: "flocons", nom: "Flocons" },
  { id: "feuilles", nom: "Feuilles" },
  { id: "confetti", nom: "Confettis" },
  { id: "guirlande", nom: "Guirlande" },
  { id: "pattes", nom: "Pattes" },
  { id: "pieds", nom: "Pas de bébé" },
  { id: "bougies", nom: "Bougies" },
  { id: "cadeaux", nom: "Cadeaux" },
  { id: "alliances", nom: "Alliances" },
];

export const DEFAULT_PRINT_MOTIF: MotifKind = PRINT_MOTIFS[0].id;

export function printMotifIndex(id: MotifKind | undefined | null): number {
  const i = PRINT_MOTIFS.findIndex((m) => m.id === id);
  return i === -1 ? 0 : i;
}

/**
 * Le motif voisin, dans un sens ou dans l'autre. La liste boucle : après le
 * dernier vient le premier.
 *
 * Fonction du motif courant vers le suivant, et non calcul à partir d'un index
 * mémorisé : c'est ce qui permet au composant d'employer la forme fonctionnelle
 * de `setState`. Sans elle, deux clics rapprochés partaient du même état — la
 * seconde flèche recalculait le voisin de l'ancien motif, et n'avançait pas.
 */
export function stepPrintMotif(id: MotifKind | undefined | null, pas: number): MotifKind {
  const courant = printMotifIndex(id);
  const total = PRINT_MOTIFS.length;
  return PRINT_MOTIFS[(((courant + pas) % total) + total) % total].id;
}
