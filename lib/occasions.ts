/**
 * Occasions : un thème complet, pas seulement des couleurs.
 *
 * Choisir une occasion pose d'un coup une palette, un décor et des formulations
 * de départ. Tout reste modifiable ensuite — l'occasion propose, elle n'impose
 * rien. Comme pour les palettes, seul l'identifiant est stocké en base.
 *
 * Aucun import Node : ce module part dans le bundle navigateur.
 */
import type { PaletteId } from "./palettes";

export type MotifKind =
  | "none"
  | "confetti"
  | "flocons"
  | "coeurs"
  | "etoiles"
  | "guirlande"
  | "feuilles";

export type OccasionId =
  | "aucune"
  | "anniversaire"
  | "noel"
  | "saint-valentin"
  | "naissance"
  | "merci"
  | "felicitations"
  | "fete-des-meres"
  | "fete-des-peres"
  | "mariage"
  | "reussite"
  | "cremaillere"
  | "retraite"
  | "nouvel-an"
  | "pot-de-depart";

/** Rubrique du sélecteur. `null` = affichée en tête, sans titre. */
export type OccasionGroup = "Fêtes du calendrier" | "Grandes étapes" | "Un mot";

export type Occasion = {
  id: OccasionId;
  name: string;
  group: OccasionGroup | null;
  /** Pictogramme du sélecteur, jamais affiché sur la page-cadeau. */
  icon: string;
  palette: PaletteId;
  motif: MotifKind;
  /** Ligne au-dessus du titre. Sert de valeur par défaut au message d'ouverture. */
  intro: string;
  /** Suggestions montrées en placeholder, jamais écrites d'office. */
  welcomeHint: string;
  thanksHint: string;
  /** Effet proposé par défaut, comme la palette et le décor. */
  effect: EffectId;
  /** Texte du bouton qui lève le voile. */
  openHint: string;
  /** Ligne d'attente sous le compte à rebours, quand la carte est scellée. */
  waitHint: string;
};

/*
 * L'écran des cadeaux est fonctionnel, pas cérémonieux : le décorum de
 * l'occasion vit sur le voile, juste avant. Ces deux suggestions sont donc
 * communes à toutes les occasions, au lieu d'être déclinées quinze fois.
 */
export const ITEMS_TITLE_HINT = "À toi de choisir";
export const ITEMS_MESSAGE_HINT = "Choisis celui qui te fait le plus envie.";

export const OCCASIONS: Occasion[] = [
  {
    id: "aucune",
    group: null,
    name: "Sans occasion",
    icon: "◇",
    palette: "terracotta",
    motif: "none",
    intro: "Un cadeau pour toi",
    welcomeHint: "Je n'ai pas su choisir. Alors je te laisse faire.",
    thanksHint: "Parfait, c'est noté. Je m'occupe du reste.",
    effect: "aucun",
    openHint: "Ouvrir",
    waitHint: "Encore un peu de patience.",
  },
  {
    id: "anniversaire",
    group: "Grandes étapes",
    name: "Anniversaire",
    icon: "✻",
    palette: "terracotta",
    motif: "confetti",
    intro: "Joyeux anniversaire",
    welcomeHint: "Un an de plus, et un cadeau à choisir toi-même.",
    thanksHint: "Excellent choix. Bon anniversaire !",
    effect: "confettis",
    openHint: "Ouvrir mon cadeau",
    waitHint: "Rendez-vous le jour J.",
  },
  {
    id: "noel",
    group: "Fêtes du calendrier",
    name: "Noël",
    icon: "❄",
    palette: "sapin",
    motif: "flocons",
    intro: "Joyeux Noël",
    welcomeHint: "Sous le sapin, cette année, c'est toi qui choisis.",
    thanksHint: "C'est noté. Joyeuses fêtes !",
    effect: "neige",
    openHint: "Ouvrir mon cadeau",
    waitHint: "Pas avant Noël, promis ?",
  },
  {
    id: "saint-valentin",
    group: "Fêtes du calendrier",
    name: "Saint-Valentin",
    icon: "♥",
    palette: "rose",
    motif: "coeurs",
    intro: "De la part de quelqu'un qui tient à toi",
    welcomeHint: "Tout ce que je sais, c'est que je voulais t'offrir quelque chose.",
    thanksHint: "Parfait. À très vite.",
    effect: "petales",
    openHint: "Ouvrir",
    waitHint: "Encore un peu de patience.",
  },
  {
    id: "naissance",
    group: "Grandes étapes",
    name: "Naissance",
    icon: "✦",
    palette: "brume",
    motif: "etoiles",
    intro: "Bienvenue au monde",
    welcomeHint: "Un petit quelque chose pour bien commencer.",
    thanksHint: "C'est noté. Félicitations !",
    effect: "etincelles",
    openHint: "Ouvrir",
    waitHint: "Bientôt, promis.",
  },
  {
    id: "felicitations",
    group: "Un mot",
    name: "Félicitations",
    icon: "✵",
    palette: "encre",
    motif: "guirlande",
    intro: "Bravo",
    welcomeHint: "Tu l'as bien mérité. À toi de choisir.",
    thanksHint: "Excellent. Encore bravo !",
    effect: "confettis",
    openHint: "Ouvrir",
    waitHint: "Ça arrive très bientôt.",
  },
  {
    id: "merci",
    group: "Un mot",
    name: "Merci",
    icon: "❖",
    palette: "olive",
    motif: "none",
    intro: "Merci",
    welcomeHint: "Un merci qui se choisit.",
    thanksHint: "C'est noté. Merci encore.",
    effect: "petales",
    openHint: "Ouvrir",
    waitHint: "Encore un peu de patience.",
  },
  {
    id: "fete-des-meres",
    group: "Fêtes du calendrier",
    name: "Fête des mères",
    icon: "❀",
    palette: "prune",
    motif: "coeurs",
    intro: "Pour toi, maman",
    welcomeHint: "Merci pour tout. Choisis ce qui te ferait plaisir.",
    thanksHint: "C'est noté. Je t'embrasse.",
    effect: "petales",
    openHint: "Ouvrir mon cadeau",
    waitHint: "Rendez-vous le jour J.",
  },
  {
    id: "fete-des-peres",
    group: "Fêtes du calendrier",
    name: "Fête des pères",
    icon: "◈",
    palette: "encre",
    motif: "none",
    intro: "Pour toi, papa",
    welcomeHint: "Tu ne demandes jamais rien. Alors cette fois, tu choisis.",
    thanksHint: "Parfait. À très bientôt.",
    effect: "aucun",
    openHint: "Ouvrir mon cadeau",
    waitHint: "Rendez-vous le jour J.",
  },
  {
    id: "nouvel-an",
    group: "Fêtes du calendrier",
    name: "Nouvel An",
    icon: "❉",
    palette: "ivoire",
    motif: "confetti",
    intro: "Bonne année",
    welcomeHint: "Pour bien commencer l'année, choisis ce qui te tente.",
    thanksHint: "C'est noté. Très belle année à toi !",
    effect: "etincelles",
    openHint: "Ouvrir",
    waitHint: "Rendez-vous à minuit.",
  },
  {
    id: "mariage",
    group: "Grandes étapes",
    name: "Mariage",
    icon: "✧",
    palette: "ivoire",
    motif: "etoiles",
    intro: "Pour vous deux",
    welcomeHint: "Pour votre nouvelle vie, c'est vous qui choisissez.",
    thanksHint: "C'est noté. Tous mes vœux à vous deux.",
    effect: "petales",
    openHint: "Ouvrir notre cadeau",
    waitHint: "Encore un peu de patience.",
  },
  {
    id: "reussite",
    group: "Grandes étapes",
    name: "Réussite",
    icon: "✶",
    palette: "encre",
    motif: "confetti",
    intro: "Tu l'as décroché",
    welcomeHint: "Après tout ce travail, tu as bien le droit de choisir.",
    thanksHint: "Excellent. Profite, c'est mérité.",
    effect: "confettis",
    openHint: "Ouvrir",
    waitHint: "Ça arrive très bientôt.",
  },
  {
    id: "cremaillere",
    group: "Grandes étapes",
    name: "Crémaillère",
    icon: "⌂",
    palette: "olive",
    motif: "feuilles",
    intro: "Bienvenue chez toi",
    welcomeHint: "Pour ton nouveau chez-toi, choisis ce qui manque encore.",
    thanksHint: "C'est noté. Bonne installation !",
    effect: "aucun",
    openHint: "Ouvrir",
    waitHint: "Encore un peu de patience.",
  },
  {
    id: "retraite",
    group: "Grandes étapes",
    name: "Retraite",
    icon: "❋",
    palette: "brume",
    motif: "feuilles",
    intro: "Et maintenant, le temps",
    welcomeHint: "Une page se tourne. Choisis de quoi remplir la suivante.",
    thanksHint: "C'est noté. Profite bien, tu l'as gagné.",
    effect: "aucun",
    openHint: "Ouvrir",
    waitHint: "Ça arrive très bientôt.",
  },
  {
    id: "pot-de-depart",
    group: "Grandes étapes",
    name: "Pot de départ",
    icon: "→",
    palette: "olive",
    motif: "none",
    intro: "Bonne route",
    welcomeHint: "L'équipe s'est cotisée. À toi de choisir.",
    thanksHint: "C'est noté. Bonne continuation !",
    effect: "confettis",
    openHint: "Ouvrir",
    waitHint: "Ça arrive très bientôt.",
  },
];

export const DEFAULT_OCCASION_ID: OccasionId = "aucune";

/**
 * Les occasions rangées par rubrique, dans l'ordre d'affichage. Passé une
 * dizaine d'entrées, une grille à plat devient illisible.
 */
export const OCCASION_GROUPS: { label: OccasionGroup | null; items: Occasion[] }[] = [
  { label: null, items: OCCASIONS.filter((o) => o.group === null) },
  ...(["Fêtes du calendrier", "Grandes étapes", "Un mot"] as OccasionGroup[]).map((label) => ({
    label,
    items: OCCASIONS.filter((o) => o.group === label),
  })),
];

export function occasionById(id: string | undefined | null): Occasion {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0];
}

export function isOccasionId(id: unknown): id is OccasionId {
  return typeof id === "string" && OCCASIONS.some((o) => o.id === id);
}

// --- Polices ---------------------------------------------------------------

export type FontId =
  | "elegant"
  | "classique"
  | "delicat"
  | "net"
  | "rond"
  | "manuscrit"
  | "calligraphie";

export type FontChoice = { id: FontId; name: string; cssVar: string; sample: string };

export const FONTS: FontChoice[] = [
  { id: "elegant", name: "Élégant", cssVar: "var(--font-display)", sample: "Aa" },
  { id: "classique", name: "Classique", cssVar: "var(--font-classic)", sample: "Aa" },
  { id: "delicat", name: "Délicat", cssVar: "var(--font-delicate)", sample: "Aa" },
  { id: "net", name: "Net", cssVar: "var(--font-sans)", sample: "Aa" },
  { id: "rond", name: "Rond", cssVar: "var(--font-round)", sample: "Aa" },
  { id: "manuscrit", name: "Manuscrit", cssVar: "var(--font-script)", sample: "Aa" },
  { id: "calligraphie", name: "Calligraphie", cssVar: "var(--font-calligraphy)", sample: "Aa" },
];

export const DEFAULT_FONT_ID: FontId = "elegant";

// --- Styles d'ouverture ----------------------------------------------------

export type OpeningId =
  | "voile"
  | "rideau"
  | "volets"
  | "enveloppe"
  | "couvercle"
  | "halo";

export type OpeningStyle = { id: OpeningId; name: string; hint: string };

export const OPENINGS: OpeningStyle[] = [
  { id: "voile", name: "Voile", hint: "Se dissipe en fondu." },
  { id: "rideau", name: "Rideau", hint: "Deux pans s'écartent sur les côtés." },
  { id: "volets", name: "Volets", hint: "Le haut et le bas s'ouvrent." },
  { id: "enveloppe", name: "Enveloppe", hint: "Le rabat se lève, la carte sort." },
  { id: "couvercle", name: "Couvercle", hint: "Le dessus se soulève d'un bloc." },
  { id: "halo", name: "Halo", hint: "Un cercle qui se resserre et s'efface." },
];

/*
 * Les effets sont separes des ouvertures : l'ouverture dit comment le voile se
 * leve, l'effet ce qui se passe juste apres, sur la page decouverte. Les deux se
 * combinent librement — un halo peut lacher des confettis — et un effet vaut
 * meme sans voile, quand le donneur l'a coupe.
 */
export type EffectId = "aucun" | "confettis" | "petales" | "etincelles" | "neige";

export type Effect = { id: EffectId; name: string; hint: string };

export const EFFECTS: Effect[] = [
  { id: "aucun", name: "Aucun", hint: "Rien ne tombe." },
  { id: "confettis", name: "Confettis", hint: "Une pluie colorée, une fois." },
  { id: "petales", name: "Pétales", hint: "Ils descendent en tournoyant." },
  { id: "etincelles", name: "Étincelles", hint: "Elles montent et s'éteignent." },
  { id: "neige", name: "Neige", hint: "Des flocons, lentement." },
];

export const DEFAULT_EFFECT_ID: EffectId = "aucun";

export function effectById(id: string | undefined | null): Effect {
  return EFFECTS.find((e) => e.id === id) ?? EFFECTS[0];
}

export function isEffectId(id: unknown): id is EffectId {
  return typeof id === "string" && EFFECTS.some((e) => e.id === id);
}

export const DEFAULT_OPENING_ID: OpeningId = "voile";

export function openingById(id: string | undefined | null): OpeningStyle {
  return OPENINGS.find((o) => o.id === id) ?? OPENINGS[0];
}

export function isOpeningId(id: unknown): id is OpeningId {
  return typeof id === "string" && OPENINGS.some((o) => o.id === id);
}

export function fontById(id: string | undefined | null): FontChoice {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

export function isFontId(id: unknown): id is FontId {
  return typeof id === "string" && FONTS.some((f) => f.id === id);
}
