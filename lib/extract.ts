import { parse } from "node-html-parser";
import { LIMITS } from "./limits";

const TIMEOUT_MS = 9000;
const MAX_HTML_BYTES = 2_500_000;

export type ExtractFailureReason =
  | "login_required"
  | "blocked"
  | "unreachable"
  | "not_html"
  | "no_image";

export type ExtractResult =
  | { ok: true; title?: string; image: string; siteName?: string }
  | { ok: false; title?: string; siteName?: string; reason: ExtractFailureReason };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Réseaux sociaux qui servent une erreur ou un mur de connexion à tout ce qui n'est pas un navigateur identifié. */
const LOGIN_WALLED_HOSTS = [
  "facebook.com",
  "instagram.com",
  "threads.net",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
];

function hostMatches(hostname: string, suffixes: string[]): boolean {
  const h = hostname.toLowerCase();
  return suffixes.some((s) => h === s || h.endsWith(`.${s}`));
}

function isAmazon(hostname: string): boolean {
  return /(^|\.)amazon\.[a-z]{2,3}(\.[a-z]{2,3})?$/i.test(hostname);
}

/**
 * Refuse les cibles internes : l'URL vient d'un formulaire anonyme, ce fetch
 * part depuis notre serveur. Filtre volontairement grossier (pas de résolution
 * DNS) — il couvre les cas évidents, pas un attaquant déterminé.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

const TRACKING_PARAMS = new Set([
  "ref",
  "ref_",
  "_encoding",
  "psc",
  "th",
  "smid",
  "tag",
  "linkcode",
  "linkid",
  "creative",
  "creativeasin",
  "content-id",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "spm",
  "srsltid",
]);

/**
 * Nettoie l'URL avant de la chercher. Les liens partagés depuis une appli
 * marchande traînent trente paramètres de suivi ; une fiche Amazon se résume à
 * son ASIN. Moins de bruit, et la page servie est plus prévisible.
 */
export function canonicaliseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  if (isAmazon(url.hostname)) {
    const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (asin) return `${url.protocol}//${url.hostname}/dp/${asin[1].toUpperCase()}`;
  }

  for (const key of [...url.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (TRACKING_PARAMS.has(k) || k.startsWith("utm_") || k.startsWith("pd_rd_") || k.startsWith("pf_rd_")) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}

function absolutise(candidate: string | undefined | null, base: string): string | null {
  if (!candidate) return null;
  const value = candidate.trim();
  if (!value || value.startsWith("data:")) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Best-effort, ne jette jamais. Un site rendu en JavaScript, un mur de connexion
 * ou un blocage anti-robot renvoient ok:false avec une raison : l'UI bascule sur
 * le repli manuel, qui est un chemin nominal et pas une exception.
 */
export async function extractFromUrl(rawUrl: string): Promise<ExtractResult> {
  let target: URL;
  try {
    target = new URL(canonicaliseUrl(rawUrl));
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return { ok: false, reason: "unreachable" };
  }
  if (isBlockedHost(target.hostname)) return { ok: false, reason: "unreachable" };

  const walled = hostMatches(target.hostname, LOGIN_WALLED_HOSTS);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.8",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    });

    if (!res.ok) {
      return { ok: false, reason: walled ? "login_required" : "blocked" };
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType && !contentType.includes("html") && !contentType.includes("xml")) {
      return { ok: false, reason: "not_html" };
    }

    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    const finalUrl = res.url || target.toString();

    if (looksLikeLoginWall(html, finalUrl) || walled) {
      const parsed = parseHtml(html, finalUrl);
      if (!parsed.ok) return { ...parsed, reason: "login_required" };
      return parsed;
    }
    if (looksLikeRobotCheck(html)) return { ok: false, reason: "blocked" };

    return parseHtml(html, finalUrl);
  } catch {
    return { ok: false, reason: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeLoginWall(html: string, finalUrl: string): boolean {
  if (/\/(login|signin|sessions\/new)(\/|\?|$)/i.test(finalUrl)) return true;
  return /<title[^>]*>\s*(?:log in|connexion|se connecter)[^<]*<\/title>/i.test(html);
}

function looksLikeRobotCheck(html: string): boolean {
  return (
    /Enter the characters you see below/i.test(html) ||
    /api-services-support@amazon\.com/i.test(html) ||
    /(?:Attention Required|Just a moment)[^<]{0,40}<\/title>/i.test(html)
  );
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

type Root = ReturnType<typeof parse>;

export function parseHtml(html: string, baseUrl: string): ExtractResult {
  let root: Root;
  try {
    // script: true garde le contenu brut des <script> — indispensable pour lire
    // le JSON-LD. style: false jette les feuilles CSS, dont on n'a rien a faire.
    root = parse(html, { blockTextElements: { script: true, style: false } });
  } catch {
    return { ok: false, reason: "no_image" };
  }

  let host = "";
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    /* base inexploitable : on se rabat sur les sélecteurs génériques */
  }

  const siteName = metaContent(root, ['meta[property="og:site_name"]', 'meta[name="og:site_name"]']);

  // Amazon ne sert ni Open Graph ni JSON-LD sur ses fiches produit : sans ce cas
  // particulier, l'heuristique générique remonte une bannière promotionnelle.
  const amazon = isAmazon(host) ? amazonProduct(root, html, baseUrl) : null;

  const rawTitle =
    amazon?.title ??
    metaContent(root, [
      'meta[property="og:title"]',
      'meta[name="og:title"]',
      'meta[name="twitter:title"]',
    ]) ??
    jsonLdProduct(root)?.name ??
    root.querySelector("title")?.text ??
    undefined;

  const image =
    amazon?.image ??
    absolutise(
      metaContent(root, [
        'meta[property="og:image:secure_url"]',
        'meta[property="og:image"]',
        'meta[name="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[property="twitter:image"]',
        'meta[itemprop="image"]',
      ]),
      baseUrl,
    ) ??
    absolutise(jsonLdProduct(root)?.image, baseUrl) ??
    absolutise(root.querySelector('link[rel="image_src"]')?.getAttribute("href"), baseUrl) ??
    firstPlausibleImage(root, baseUrl);

  const title = rawTitle ? cleanTitle(rawTitle, siteName, host) : undefined;

  if (!image) return { ok: false, title, siteName, reason: "no_image" };
  return { ok: true, title, image, siteName };
}

function metaContent(root: Root, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    const content = el?.getAttribute("content") ?? el?.getAttribute("value");
    if (content && content.trim()) return content.trim();
  }
  return undefined;
}

// --- Amazon ----------------------------------------------------------------

function amazonProduct(
  root: Root,
  html: string,
  baseUrl: string,
): { title?: string; image: string | null } | null {
  const title = root.querySelector("#productTitle")?.text?.trim() || undefined;

  const landing = root.querySelector("#landingImage");
  // `data-old-hires` et `hiRes` portent la pleine résolution ; la carte
  // `data-a-dynamic-image` ne contient souvent que les variantes d'affichage.
  const image =
    absolutise(landing?.getAttribute("data-old-hires"), baseUrl) ??
    absolutise(html.match(/"hiRes"\s*:\s*"(https:[^"]+)"/)?.[1], baseUrl) ??
    largestFromDynamicImage(landing?.getAttribute("data-a-dynamic-image")) ??
    absolutise(landing?.getAttribute("src"), baseUrl) ??
    absolutise(html.match(/"large"\s*:\s*"(https:[^"]+)"/)?.[1], baseUrl);

  if (!title && !image) return null;
  return { title, image };
}

/** `data-a-dynamic-image` est une carte { url: [largeur, hauteur] } : on garde la plus grande. */
function largestFromDynamicImage(attr: string | undefined | null): string | null {
  if (!attr) return null;
  let map: Record<string, [number, number]> | null = null;
  for (const candidate of [attr, attr.replace(/&quot;/g, '"')]) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, [number, number]>;
      if (parsed && typeof parsed === "object") {
        map = parsed;
        break;
      }
    } catch {
      /* on tente la variante suivante */
    }
  }
  if (!map) return null;

  let best: { url: string; area: number } | null = null;
  for (const [url, size] of Object.entries(map)) {
    const area = Array.isArray(size) ? Number(size[0]) * Number(size[1]) : 0;
    if (!url.startsWith("http")) continue;
    if (!best || area > best.area) best = { url, area };
  }
  return best?.url ?? null;
}

// --- JSON-LD ---------------------------------------------------------------

/** Beaucoup de boutiques n'ont pas d'Open Graph mais déclarent un Product en JSON-LD. */
function jsonLdProduct(root: Root): { name?: string; image?: string } | null {
  for (const script of root.querySelectorAll('script[type="application/ld+json"]').slice(0, 12)) {
    let data: unknown;
    try {
      data = JSON.parse(script.text);
    } catch {
      continue;
    }
    const found = findProduct(data, 0);
    if (found) return found;
  }
  return null;
}

function findProduct(node: unknown, depth: number): { name?: string; image?: string } | null {
  if (depth > 6 || !node || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = findProduct(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const o = node as Record<string, unknown>;
  const type = o["@type"];
  const types = Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
  if (types.some((t) => /^(Product|ProductGroup|IndividualProduct)$/i.test(t))) {
    const image = firstImageValue(o.image);
    const name = typeof o.name === "string" ? o.name : undefined;
    if (image || name) return { name, image };
  }

  for (const key of ["@graph", "mainEntity", "itemListElement", "hasVariant"]) {
    const found = findProduct(o[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function firstImageValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstImageValue(entry);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

// --- Repli <img> -----------------------------------------------------------

const IGNORED_IMAGE_HINTS =
  /sprite|logo|icon|avatar|pixel|placeholder|1x1|blank|spacer|badge|banner|promo|deal|advert|\bads?\b|payment|paiement|visa|mastercard|bancontact|newsletter|trustpilot/i;

function firstPlausibleImage(root: Root, baseUrl: string): string | null {
  const imgs = root.querySelectorAll("img");
  let best: { url: string; score: number } | null = null;

  for (const img of imgs.slice(0, 120)) {
    const raw =
      img.getAttribute("src") ??
      img.getAttribute("data-src") ??
      img.getAttribute("data-lazy-src") ??
      firstFromSrcset(img.getAttribute("srcset"));
    const url = absolutise(raw, baseUrl);
    if (!url) continue;

    const haystack = `${url} ${img.getAttribute("class") ?? ""} ${img.getAttribute("id") ?? ""} ${img.getAttribute("alt") ?? ""}`;
    if (IGNORED_IMAGE_HINTS.test(haystack)) continue;

    const width = Number.parseInt(img.getAttribute("width") ?? "", 10);
    const height = Number.parseInt(img.getAttribute("height") ?? "", 10);
    if ((Number.isFinite(width) && width < 200) || (Number.isFinite(height) && height < 200)) continue;

    const score = (Number.isFinite(width) ? width : 0) * (Number.isFinite(height) ? height : 1) || 1;
    if (!best || score > best.score) best = { url, score };
  }

  return best?.url ?? null;
}

function firstFromSrcset(srcset: string | undefined | null): string | null {
  if (!srcset) return null;
  const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
  return first || null;
}

// --- Titre -----------------------------------------------------------------

const TITLE_SEPARATORS = /\s+[|–—·:]\s+|\s+-\s+/;

/**
 * Un <title> de boutique finit presque toujours par le nom du site, et une fiche
 * Amazon tient rarement en 80 caractères. On retire la queue redondante puis on
 * coupe sur un mot entier, pour que le champ « Titre » soit utilisable tel quel.
 */
export function cleanTitle(raw: string, siteName?: string, host?: string): string {
  const flat = raw.replace(/\s+/g, " ").trim();
  const parts = flat.split(TITLE_SEPARATORS).filter((p) => p.trim() !== "");
  if (parts.length === 0) return truncateOnWord(flat, LIMITS.itemLabel);

  const brands = [siteName, host?.replace(/^www\./, "").split(".")[0]]
    .filter((b): b is string => Boolean(b))
    .map(normalise);

  while (parts.length > 1) {
    const tail = normalise(parts[parts.length - 1]);
    if (tail && brands.some((b) => b && (tail === b || tail.includes(b) || b.includes(tail)))) {
      parts.pop();
      continue;
    }
    break;
  }

  return truncateOnWord(parts.join(" — ").trim() || flat, LIMITS.itemLabel);
}

/** Compare des noms de marque sans se soucier des accents, casse ni ponctuation. */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function truncateOnWord(value: string, max: number): string {
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > max * 0.5 ? slice.slice(0, cut) : slice).replace(/[\s,;:–—-]+$/, "")}…`;
}
