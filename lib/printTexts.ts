/**
 * Les mots de la carte imprimée, gardés sur l'appareil.
 *
 * Ils reprennent d'abord ceux de la page-cadeau — c'est presque toujours ce
 * qu'on veut — mais ce sont deux objets différents. Une page qu'on ouvre au
 * téléphone et une carte qu'on tient dans la main n'appellent pas la même
 * formule : « Je n'ai pas su choisir » se lit bien à l'écran, moins bien gravé
 * sur du papier qu'on offrira. Ils se modifient donc séparément, sans toucher à
 * la page.
 *
 * **Sur l'appareil, pas en base.** Les persister demanderait cinq colonnes, une
 * migration et autant de règles de validation, pour un texte qu'on écrit une
 * fois juste avant d'imprimer. `localStorage` couvre le vrai risque — recharger
 * la page ou revenir imprimer un deuxième exemplaire — sans rien ajouter au
 * schéma. C'est le même arbitrage que pour le modèle de carte, et le même
 * mécanisme que le brouillon de composition.
 *
 * Tout est enveloppé dans des `try` : en navigation privée ou avec le quota
 * plein, le simple fait de lire `localStorage` lève une exception. Perdre le
 * texte est désagréable ; casser la page d'impression le serait plus.
 *
 * Aucun import Node : ce module part dans le bundle navigateur.
 */

import { DUREE_VIE_PAGE_JOURS } from "./env";

/** Change dès que la forme change. Une version antérieure est jetée, pas devinée. */
const VERSION = 1;

/**
 * La durée de vie d'une page gratuite : au-delà, la carte à laquelle ces mots
 * appartenaient n'existe plus. Lue dans `env.ts` plutôt que recopiée, pour
 * suivre la page si sa durée change.
 */
const DUREE_MS = DUREE_VIE_PAGE_JOURS * 24 * 60 * 60 * 1000;

/** Une clé par carte : un donneur peut en avoir plusieurs en cours. */
function cle(slug: string): string {
  return `mypresentsforyou:carte:${slug}`;
}

/*
 * L'ancienne cle, du temps ou le site portait un autre nom. Meme raison que dans
 * `draft.ts` : renommer sans relire jette ce qui etait deja ecrit. La perte
 * serait moins grave — des textes de carte, pas une carte entiere — mais le
 * rattrapage tient en une ligne. A retirer passe la duree de `DUREE_MS`.
 */
function cleAncienne(slug: string): string {
  return `givly:carte:${slug}`;
}

export type PrintTexts = {
  to: string;
  intro: string;
  title: string;
  signature: string;
  /** La ligne sous le QR code, au dos. */
  cta: string;
};

export const CTA_DEFAUT = "Scanne pour ouvrir ta carte";

/** Bornes de saisie. Au-delà, le texte déborde de la feuille au lieu de rétrécir. */
export const PRINT_LIMITS = {
  to: 60,
  intro: 80,
  title: 160,
  signature: 80,
  cta: 60,
} as const;

export function ecrirePrintTexts(slug: string, t: PrintTexts): void {
  try {
    localStorage.setItem(cle(slug), JSON.stringify({ ...t, version: VERSION, a: Date.now() }));
    localStorage.removeItem(cleAncienne(slug));
  } catch {
    /* quota plein, navigation privee : on continue sans filet */
  }
}

export function effacerPrintTexts(slug: string): void {
  try {
    localStorage.removeItem(cle(slug));
    localStorage.removeItem(cleAncienne(slug));
  } catch {
    /* rien a faire de plus */
  }
}

/**
 * Relit les mots gardés, ou `null`.
 *
 * Le contenu vient du stockage de l'appareil : il a pu être écrit par une
 * version antérieure, tronqué, ou modifié à la main. Chaque champ est donc
 * ramené à son type et à sa longueur attendus plutôt que cru sur parole.
 */
export function lirePrintTexts(slug: string): PrintTexts | null {
  let brut: unknown;
  try {
    const texte = localStorage.getItem(cle(slug)) ?? localStorage.getItem(cleAncienne(slug));
    if (!texte) return null;
    brut = JSON.parse(texte);
  } catch {
    return null;
  }

  if (typeof brut !== "object" || brut === null) return null;
  const o = brut as Record<string, unknown>;
  if (o.version !== VERSION) return null;

  const a = typeof o.a === "number" ? o.a : 0;
  if (!a || Date.now() - a > DUREE_MS) return null;

  const champ = (v: unknown, max: number): string =>
    typeof v === "string" ? v.slice(0, max) : "";

  return {
    to: champ(o.to, PRINT_LIMITS.to),
    intro: champ(o.intro, PRINT_LIMITS.intro),
    title: champ(o.title, PRINT_LIMITS.title),
    signature: champ(o.signature, PRINT_LIMITS.signature),
    cta: champ(o.cta, PRINT_LIMITS.cta),
  };
}
