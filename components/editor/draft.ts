/**
 * Le brouillon de composition, garde sur l'appareil.
 *
 * Au telephone, composer une carte veut dire quitter le site : on va chez le
 * marchand chercher une adresse ou une image, puis on revient. Le navigateur, lui,
 * decharge volontiers un onglet passe en arriere-plan — et l'etat React part avec.
 * Le donneur retrouvait un formulaire vide au milieu de son travail, ce qui est le
 * meilleur moyen de le lui faire abandonner.
 *
 * `localStorage` et non `sessionStorage` : le second ne survit pas a un onglet
 * ferme, or c'est justement le cas a couvrir. Le brouillon ne quitte jamais
 * l'appareil, n'est jamais envoye au serveur, et disparait des que la page est
 * creee.
 *
 * Tout est enveloppe dans des `try` : en navigation privee, avec les cookies
 * tiers coupes ou le quota plein, le simple fait de lire `localStorage` leve une
 * exception. Perdre le brouillon est desagreable ; casser le formulaire le
 * serait bien plus.
 */

const CLE = "givly:brouillon";

/**
 * Change des que la forme du brouillon change. Un brouillon d'une version
 * anterieure est jete plutot que devine : la restauration doit etre sure, pas
 * ingenieuse.
 */
const VERSION = 1;

/**
 * Sept jours. Au-dela, une carte a demi composee n'est plus un travail en cours
 * mais une intention oubliee, et la voir resurgir surprendrait plus qu'elle
 * n'aiderait.
 */
const DUREE_MS = 7 * 24 * 60 * 60 * 1000;

export type LigneBrouillon = {
  label: string;
  image_url: string;
  source_url: string;
  note: string;
};

export type Brouillon = {
  version: number;
  /** Horodatage du dernier enregistrement, pour l'expiration. */
  a: number;
  etape: number;
  name: string;
  intro: string;
  signature: string;
  recipient: string;
  header: string;
  revealAt: string;
  welcome: string;
  openLabel: string;
  waitMessage: string;
  itemsTitle: string;
  itemsMessage: string;
  thanks: string;
  cover: string;
  layout: string;
  palette: string;
  occasion: string;
  font: string;
  opening: string;
  effect: string;
  linkTitle: string;
  motif: boolean;
  replyOn: boolean;
  sealEnabled: boolean;
  headerOn: boolean;
  linkOn: boolean;
  revealOn: boolean;
  items: LigneBrouillon[];
};

/** Vrai si le brouillon porte au moins une trace de travail. */
export function brouillonUtile(b: Brouillon): boolean {
  const textes = [
    b.name,
    b.intro,
    b.signature,
    b.recipient,
    b.header,
    b.welcome,
    b.openLabel,
    b.waitMessage,
    b.itemsTitle,
    b.itemsMessage,
    b.thanks,
    b.cover,
    b.linkTitle,
    b.revealAt,
  ];
  if (textes.some((t) => t.trim() !== "")) return true;
  return b.items.some(
    (i) => i.label.trim() || i.image_url.trim() || i.source_url.trim() || i.note.trim(),
  );
}

export function ecrireBrouillon(b: Brouillon): void {
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...b, version: VERSION, a: Date.now() }));
  } catch {
    /* quota plein, navigation privee : on continue sans filet */
  }
}

export function effacerBrouillon(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien a faire de plus */
  }
}

/**
 * Relit le brouillon, ou `null` s'il n'y en a pas d'exploitable.
 *
 * Le contenu vient du stockage de l'appareil : il a pu etre ecrit par une
 * version anterieure, tronque, ou modifie a la main. Chaque champ est donc
 * ramene a son type attendu plutot que fait confiance. Les identifiants de theme
 * ne sont pas valides ici — l'editeur les fait deja passer par `occasionById`,
 * `paletteIdOf` et consorts, qui retombent seuls sur la valeur par defaut.
 */
export function lireBrouillon(): Brouillon | null {
  let brut: unknown;
  try {
    const texte = localStorage.getItem(CLE);
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

  const texte = (v: unknown): string => (typeof v === "string" ? v : "");
  const bool = (v: unknown, defaut: boolean): boolean => (typeof v === "boolean" ? v : defaut);

  const lignes = Array.isArray(o.items) ? o.items : [];
  const items: LigneBrouillon[] = lignes
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .slice(0, 50)
    .map((l) => ({
      label: texte(l.label),
      image_url: texte(l.image_url),
      source_url: texte(l.source_url),
      note: texte(l.note),
    }));

  const etape = o.etape === 2 ? 2 : 1;

  return {
    version: VERSION,
    a,
    etape,
    name: texte(o.name),
    intro: texte(o.intro),
    signature: texte(o.signature),
    recipient: texte(o.recipient),
    header: texte(o.header),
    revealAt: texte(o.revealAt),
    welcome: texte(o.welcome),
    openLabel: texte(o.openLabel),
    waitMessage: texte(o.waitMessage),
    itemsTitle: texte(o.itemsTitle),
    itemsMessage: texte(o.itemsMessage),
    thanks: texte(o.thanks),
    cover: texte(o.cover),
    layout: o.layout === "list" ? "list" : "grid",
    palette: texte(o.palette),
    occasion: texte(o.occasion),
    font: texte(o.font),
    opening: texte(o.opening),
    effect: texte(o.effect),
    linkTitle: texte(o.linkTitle),
    motif: bool(o.motif, true),
    replyOn: bool(o.replyOn, false),
    sealEnabled: bool(o.sealEnabled, true),
    headerOn: bool(o.headerOn, false),
    linkOn: bool(o.linkOn, false),
    revealOn: bool(o.revealOn, false),
    items,
  };
}
