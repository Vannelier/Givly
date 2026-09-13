export function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Un an. A trente jours, une carte avait disparu bien avant que l'occasion ne
 * revienne — un anniversaire, Noel — alors que c'est a ce moment-la qu'on
 * voudrait la retrouver. Exportee pour la carte a imprimer, dont les mots gardes
 * sur l'appareil se perimment avec la page : deux durees recopiees a la main
 * finiraient par diverger.
 */
export const DUREE_VIE_PAGE_JOURS = 365;

export function freePageTtlDays(): number {
  const n = Number.parseInt(process.env.FREE_PAGE_TTL_DAYS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : DUREE_VIE_PAGE_JOURS;
}

/**
 * L'identifiant d'editeur AdSense, s'il est pose et bien forme ; `null` sinon.
 *
 * Il vit dans l'environnement et non dans le code : changer de compte, ou
 * retirer la publicite, ne demande qu'une variable. Un identifiant mal forme est
 * ignore plutot que publie — un ads.txt qui declare un compte inexistant ne sert
 * a rien, et Google le signale comme une erreur.
 *
 * `ca-pub-…` est accepte : c'est la forme que montre le code d'annonce, donc
 * celle qu'on copie. ads.txt, lui, veut `pub-…`.
 */
export function adsensePublisherId(): string | null {
  const id = (process.env.ADSENSE_PUBLISHER_ID?.trim() ?? "").replace(/^ca-/, "");
  return /^pub-\d{16}$/.test(id) ? id : null;
}

export function publicUrlFor(slug: string): string {
  return `${baseUrl()}/${slug}`;
}

export function adminUrlFor(token: string): string {
  return `${baseUrl()}/admin/${token}`;
}
