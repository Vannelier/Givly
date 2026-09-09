/**
 * L'identité du site, en un seul endroit.
 *
 * Les mentions légales, la politique de confidentialité et la page de contact
 * lisent toutes ces valeurs. Les éparpiller dans cinq pages garantissait qu'une
 * adresse changée un jour reste périmée dans trois d'entre elles.
 *
 * ⚠️ Les valeurs marquées `À REMPLIR` sont des espaces réservés. Une mention
 * légale est une obligation qui engage l'éditeur : elle doit porter une identité
 * réelle et vérifiable, et personne d'autre que lui ne peut la renseigner. Tant
 * qu'elles ne sont pas remplies, la page les affiche comme manquantes plutôt que
 * d'inventer — mieux vaut un trou visible qu'une fausse déclaration.
 */

export const SITE = {
  nom: "MyPresentsForYou",
  /** Baseline courte, reprise dans les données structurées. */
  accroche: "Offrir plusieurs idées cadeau, et laisser la personne choisir.",

  /**
   * Adresse de contact publiée sur le site. Elle sera visible de tous et
   * moissonnée par des robots : prévoir une adresse dédiée plutôt qu'une adresse
   * personnelle.
   */
  email: "novlease.contact@gmail.com",

  /** Éditeur du site : personne physique ou société. */
  editeur: {
    /**
     * Raison sociale exacte, telle qu'elle figure à la Banque-Carrefour des
     * Entreprises. Pas déduite de l'adresse de contact : une mention légale doit
     * porter le nom déposé, pas une approximation.
     */
    nom: "À REMPLIR",
    /** `particulier` allège les mentions obligatoires ; `societe` les étend. */
    statut: "societe" as "particulier" | "societe",
    /** Adresse postale. Obligatoire pour une société ; recommandée sinon. */
    adresse: "À REMPLIR",
    /** Numéro d'entreprise (BCE en Belgique, SIREN en France). Sociétés uniquement. */
    numeroEntreprise: "",
    /** Numéro de TVA, si assujetti. */
    tva: "",
  },

  /** Qui héberge le site. Son nom et son adresse sont des mentions obligatoires. */
  hebergeur: {
    nom: "À REMPLIR",
    adresse: "À REMPLIR",
  },
} as const;

/** Vrai tant qu'une mention obligatoire n'a pas été renseignée. */
export function aRemplir(valeur: string): boolean {
  return valeur.trim() === "" || valeur.trim() === "À REMPLIR";
}

/** Les sous-traitants qui voient passer des données, cités nommément. */
export const SOUS_TRAITANTS = [
  {
    nom: "L'hébergeur du site et de la base de données",
    role: "Stocke les pages-cadeau et sert les pages.",
    detail: "Renseigné dans les mentions légales.",
  },
  {
    nom: "Vercel Blob",
    role: "Stocke les images des cadeaux.",
    detail: "Utilisé uniquement si le stockage est configuré ; sinon les images restent sur le serveur.",
  },
] as const;
