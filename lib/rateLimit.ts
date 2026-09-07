/**
 * Limitation de débit pour les routes ouvertes et anonymes.
 *
 * Aucun compte, aucun paiement, aucune adresse : rien n'empêche aujourd'hui de
 * créer des milliers de pages ou de téléverser des milliers d'images. Ces routes
 * coûtent en base, en stockage et en requêtes sortantes.
 *
 * Seau à jetons plutôt que fenêtre fixe : une fenêtre fixe laisse passer deux
 * fois le quota à cheval sur sa frontière, et repart brutalement à zéro. Ici le
 * crédit se reconstitue en continu, ce qui autorise une rafale courte tout en
 * tenant la moyenne.
 *
 * Volontairement en mémoire, sans Redis ni table dédiée : le compteur est vivant
 * quelques minutes et n'a pas à survivre. Ce que ça implique, en toute
 * franchise :
 *
 *  - **Le compte est par instance.** Deux instances derrière un répartiteur
 *    doublent le quota réel. Acceptable ici : les seuils sont larges par rapport
 *    à un usage normal et serrés par rapport à un abus.
 *  - **Un redémarrage remet tout à zéro.** Un attaquant patient attend un
 *    redéploiement ; c'est pourquoi le plafond global existe aussi.
 *  - **Rien de tout ça ne remplace un captcha** le jour où l'abus devient ciblé.
 *
 * Le module ne connaît ni Next ni HTTP : il est testable tel quel, avec une
 * horloge injectée (voir `scripts/check.ts`).
 */

export type Quota = {
  /** Nombre de requêtes autorisées sur la fenêtre. */
  limite: number;
  /** Durée sur laquelle le crédit se reconstitue entièrement, en millisecondes. */
  fenetreMs: number;
};

const MINUTE = 60_000;

/*
 * Les seuils sont calibrés sur l'usage réel, pas sur le pire cas imaginable :
 * composer une carte, c'est une création et quelques images. Dix créations en
 * dix minutes laissent largement la place à l'hésitation et aux essais, tout en
 * plafonnant à moins de mille cinq cents pages par jour et par adresse.
 */
export const QUOTAS = {
  /** `POST /api/pages` — le plus coûteux : insertion, recopie d'images, stockage. */
  creation: { limite: 10, fenetreMs: 10 * MINUTE },
  /** Plafond tous clients confondus, filet contre un abus réparti sur des adresses. */
  creationGlobale: { limite: 100, fenetreMs: 10 * MINUTE },
  /** `POST /api/upload` — plusieurs images par carte, donc plus permissif. */
  televersement: { limite: 30, fenetreMs: 10 * MINUTE },
  /** `POST /api/extract` — requêtes sortantes depuis le serveur. */
  extraction: { limite: 40, fenetreMs: 10 * MINUTE },
  /** `choose` et `reply` : verrouillées métier, mais énumérables. */
  reponse: { limite: 30, fenetreMs: 10 * MINUTE },
  /** `PATCH` / `DELETE` admin : le jeton est déjà infalsifiable, ceci évite le martèlement. */
  admin: { limite: 60, fenetreMs: 10 * MINUTE },
} as const;

export type Verdict = { ok: true } | { ok: false; retryAfterS: number };

type Seau = {
  /** Crédit restant, fractionnaire : il se reconstitue en continu. */
  jetons: number;
  /** Dernier passage, pour calculer la recharge. */
  vu: number;
};

/**
 * Plafond du nombre d'entrées suivies.
 *
 * Sans lui, la table des compteurs serait elle-même un vecteur : il suffirait de
 * faire tourner l'adresse source pour la faire grossir sans fin. On préfère
 * oublier de vieux compteurs — au pire quelqu'un récupère son crédit trop tôt —
 * plutôt que de saturer la mémoire du serveur.
 */
const MAX_ENTREES = 20_000;

export type Limiteur = {
  consomme: (quota: Quota, cle: string, maintenant?: number) => Verdict;
  taille: () => number;
};

export function creerLimiteur(maxEntrees = MAX_ENTREES): Limiteur {
  const seaux = new Map<string, Seau>();

  /**
   * Fait de la place. On jette d'abord les compteurs revenus à plein : ils ne
   * disent plus rien qu'un compteur neuf ne dirait. Si ça ne suffit pas, les
   * plus anciens partent — ce sont les moins susceptibles d'être en cours
   * d'abus, puisqu'ils n'ont pas été touchés depuis longtemps.
   */
  function faireDeLaPlace(quota: Quota, maintenant: number) {
    for (const [cle, seau] of seaux) {
      if (recharge(seau, quota, maintenant) >= quota.limite) seaux.delete(cle);
    }
    if (seaux.size < maxEntrees) return;

    const parAnciennete = [...seaux.entries()].sort((a, b) => a[1].vu - b[1].vu);
    const aJeter = seaux.size - Math.floor(maxEntrees / 2);
    for (let i = 0; i < aJeter; i++) seaux.delete(parAnciennete[i][0]);
  }

  function recharge(seau: Seau, quota: Quota, maintenant: number): number {
    const ecoule = Math.max(0, maintenant - seau.vu);
    const gagnes = (ecoule * quota.limite) / quota.fenetreMs;
    return Math.min(quota.limite, seau.jetons + gagnes);
  }

  return {
    consomme(quota, cle, maintenant = Date.now()): Verdict {
      const existant = seaux.get(cle);
      const jetons = existant ? recharge(existant, quota, maintenant) : quota.limite;

      if (jetons < 1) {
        // Le compteur n'est pas rafraîchi ici : refuser ne doit pas décaler la
        // date de recharge, sinon marteler la route repousserait indéfiniment le
        // moment où le crédit revient.
        const manque = 1 - jetons;
        const attenteMs = (manque * quota.fenetreMs) / quota.limite;
        return { ok: false, retryAfterS: Math.max(1, Math.ceil(attenteMs / 1000)) };
      }

      if (!existant && seaux.size >= maxEntrees) faireDeLaPlace(quota, maintenant);
      seaux.set(cle, { jetons: jetons - 1, vu: maintenant });
      return { ok: true };
    },

    taille: () => seaux.size,
  };
}

/** Le limiteur du processus. Les tests créent le leur, isolé. */
const partage = creerLimiteur();

export function consomme(quota: Quota, cle: string, maintenant?: number): Verdict {
  return partage.consomme(quota, cle, maintenant);
}

/**
 * L'adresse du client, telle que la rapporte l'hébergeur.
 *
 * `x-forwarded-for` est falsifiable quand rien ne le réécrit : ce code suppose
 * donc que l'application est servie **derrière le proxy de l'hébergeur**
 * (Railway, Vercel, Cloudflare…), lequel pose l'en-tête lui-même. Exposer le
 * serveur Node directement à Internet rendrait la limitation contournable d'un
 * simple en-tête.
 *
 * Les en-têtes propres à une plateforme passent en premier : quand ils existent,
 * ils sont posés par elle et ne peuvent pas être soufflés par le client.
 */
export function adresseClient(req: Request): string {
  const h = req.headers;
  const direct =
    h.get("cf-connecting-ip") ?? h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
  if (direct && direct.trim()) return direct.trim();

  const transmis = h.get("x-forwarded-for");
  if (transmis) {
    const premier = transmis.split(",")[0]?.trim();
    if (premier) return premier;
  }

  // En développement, aucun proxy : tout le monde partage ce compteur. C'est
  // aussi le cas d'un déploiement mal configuré — d'où la trace.
  return "sans-adresse";
}

/**
 * Échappatoire pour le développement local, où l'absence de proxy fait partager
 * un seul compteur à toute la machine. Jamais à poser en production.
 */
export function limitationDesactivee(): boolean {
  return process.env.RATE_LIMIT_DISABLED === "1";
}
