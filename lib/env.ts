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

export function publicUrlFor(slug: string): string {
  return `${baseUrl()}/${slug}`;
}

export function adminUrlFor(token: string): string {
  return `${baseUrl()}/admin/${token}`;
}
