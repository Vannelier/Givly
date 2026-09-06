export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "creer",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "opengraph-image",
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** Transforme un texte libre en slug candidat. Peut renvoyer "" si rien d'exploitable. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function slugError(slug: string): string | null {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return `L'adresse doit faire entre ${SLUG_MIN} et ${SLUG_MAX} caracteres.`;
  }
  if (!SLUG_RE.test(slug)) {
    return "L'adresse ne peut contenir que des lettres minuscules, des chiffres et des tirets, sans tiret au debut ni a la fin.";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return "Cette adresse est reservee, choisis-en une autre.";
  }
  return null;
}

/** Propose slug-2, slug-3... en respectant la longueur max. */
export function suggestVariant(slug: string, n: number): string {
  const suffix = `-${n}`;
  return `${slug.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
}
