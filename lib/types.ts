export type Layout = "grid" | "list";

export type Theme = {
  layout: Layout;
  palette?: Record<string, string>;
  /** Identifiant d'occasion : pose palette, decor et formulations par defaut. */
  occasion?: string;
  /** Identifiant de police d'affichage. */
  font?: string;
  /** Decor de l'occasion. Actif par defaut des qu'une occasion en propose un. */
  motif?: boolean;
  /** Voile d'ouverture avant de decouvrir les cadeaux. Actif par defaut. */
  cover?: boolean;
  /** Proposer au receveur de laisser un mot avec son choix. Inactif par defaut. */
  reply?: boolean;
  /** Maniere dont le voile se leve. */
  opening?: string;
};

export type Item = {
  id: string;
  label: string;
  image_url: string | null;
  source_url?: string | null;
  note?: string | null;
};

export type Plan = "free" | "paid";

export type GiftPage = {
  id: string;
  slug: string;
  admin_token: string;
  /** Nom que le donneur donne a sa carte. Jamais montre au receveur. */
  name: string;
  /** Ligne au-dessus du titre. Vide = valeur par defaut de l'occasion. */
  intro_message: string;
  /** Ligne de signature en bas de page. Vide = rien affiche. */
  signature: string;
  /** Prenom de la personne a qui la carte s'adresse. Vide = rien affiche. */
  recipient_name: string;
  /** Photo en tete de la page-cadeau. */
  header_image_url: string | null;
  /** Tant que cette date n'est pas passee, la carte reste scellee. */
  reveal_at: string | null;
  /** Mot laisse par le receveur avec son choix. */
  reply_message: string;
  welcome_message: string;
  thank_you_message: string;
  cover_image_url: string | null;
  theme: Theme;
  items: Item[];
  plan: Plan;
  created_at: string;
  expires_at: string | null;
  chosen_item_id: string | null;
  chosen_at: string | null;
  updated_at: string;
  view_count: number;
};

/** Ce que le receveur / la preview reçoit : jamais l'admin_token. */
export type PublicPage = {
  slug: string;
  reply_message: string;
  intro_message: string;
  signature: string;
  recipient_name: string;
  header_image_url: string | null;
  reveal_at: string | null;
  welcome_message: string;
  thank_you_message: string;
  theme: Theme;
  items: Item[];
  chosen_item_id: string | null;
  chosen_at: string | null;
};

export const DEFAULT_THEME: Theme = { layout: "grid" };

export function toPublicPage(p: GiftPage): PublicPage {
  return {
    slug: p.slug,
    reply_message: p.reply_message,
    intro_message: p.intro_message,
    signature: p.signature,
    recipient_name: p.recipient_name,
    header_image_url: p.header_image_url,
    reveal_at: p.reveal_at,
    welcome_message: p.welcome_message,
    thank_you_message: p.thank_you_message,
    theme: p.theme,
    items: p.items,
    chosen_item_id: p.chosen_item_id,
    chosen_at: p.chosen_at,
  };
}

export function isExpired(p: Pick<GiftPage, "expires_at">, now = new Date()): boolean {
  if (!p.expires_at) return false;
  return new Date(p.expires_at).getTime() <= now.getTime();
}

export function isLocked(p: Pick<GiftPage, "chosen_at">): boolean {
  return p.chosen_at !== null && p.chosen_at !== undefined;
}

/** Scellee : la date de revelation n'est pas encore atteinte. */
export function isSealed(p: Pick<GiftPage, "reveal_at">, now = new Date()): boolean {
  if (!p.reveal_at) return false;
  return new Date(p.reveal_at).getTime() > now.getTime();
}
