/**
 * Unique point de contact avec Postgres.
 *
 * Pilote `pg` standard, et non `@vercel/postgres` : ce dernier ne parle qu'à
 * Neon et refuse toute autre chaîne de connexion avec `invalid_connection_string`.
 * `pg` accepte les deux — Neon comme Railway, Supabase ou un Postgres local —
 * ce qui laisse le choix de l'hébergeur ouvert.
 *
 * `sql` est un gabarit tagué : les valeurs interpolées deviennent des paramètres
 * $1, $2… donc rien n'est concaténé dans la requête.
 */
import { Pool, type PoolClient } from "pg";
import type { GiftPage, Item, Theme } from "./types";
import { DEFAULT_THEME } from "./types";

export class DbNotConfiguredError extends Error {
  constructor() {
    super(
      "POSTGRES_URL est absent. Renseigne la chaîne de connexion (voir .env.example), " +
        "puis applique le schema avec `npm run db:migrate`.",
    );
    this.name = "DbNotConfiguredError";
  }
}

export function connectionString(): string {
  const url = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new DbNotConfiguredError();
  return url;
}

/**
 * Neon et le proxy public de Railway exigent TLS ; le réseau interne de Railway
 * et un Postgres local ne le proposent pas. On choisit d'après l'hôte plutôt que
 * d'imposer un réglage qui casserait la moitié des cas.
 */
export function sslFor(url: string): { rejectUnauthorized: boolean } | undefined {
  try {
    const host = new URL(url).hostname;
    const interne =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".internal") ||
      host.endsWith(".local");
    return interne ? undefined : { rejectUnauthorized: false };
  } catch {
    return undefined;
  }
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = connectionString();
    pool = new Pool({
      connectionString: url,
      ssl: sslFor(url),
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    // Sans ce garde, une erreur sur une connexion au repos fait tomber le process.
    pool.on("error", (err) => console.error("[givly] pool postgres", err.message));
  }
  return pool;
}

export type QueryResult = { rows: Record<string, unknown>[]; rowCount: number };

/**
 * Traduit le gabarit tague en requete parametree. Extrait pour etre testable
 * sans base : une erreur de numerotation des $n casserait toutes les requetes.
 */
export function toQuery(
  strings: ReadonlyArray<string>,
  values: unknown[],
): { text: string; values: unknown[] } {
  const text = strings.reduce(
    (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
    "",
  );
  return { text, values };
}

export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult> {
  const { text } = toQuery(strings, values);
  const res = await getPool().query(text, values);
  return { rows: res.rows as Record<string, unknown>[], rowCount: res.rowCount ?? 0 };
}

/** Une connexion dédiée, pour les scripts qui enchaînent plusieurs instructions. */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Lecture des lignes
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

export function rowToPage(row: Row): GiftPage {
  return {
    id: String(row.id),
    slug: String(row.slug),
    admin_token: String(row.admin_token),
    name: String(row.name ?? ""),
    intro_message: String(row.intro_message ?? ""),
    signature: String(row.signature ?? ""),
    recipient_name: String(row.recipient_name ?? ""),
    header_image_url: (row.header_image_url as string | null) ?? null,
    reveal_at: row.reveal_at ? toIso(row.reveal_at) : null,
    reply_message: String(row.reply_message ?? ""),
    link_title: String(row.link_title ?? ""),
    welcome_message: String(row.welcome_message ?? ""),
    open_label: String(row.open_label ?? ""),
    wait_message: String(row.wait_message ?? ""),
    items_title: String(row.items_title ?? ""),
    items_message: String(row.items_message ?? ""),
    thank_you_message: String(row.thank_you_message ?? ""),
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    theme: normaliseTheme(row.theme),
    items: normaliseItems(row.items),
    plan: (row.plan as GiftPage["plan"]) ?? "free",
    created_at: toIso(row.created_at),
    expires_at: row.expires_at ? toIso(row.expires_at) : null,
    chosen_item_id: (row.chosen_item_id as string | null) ?? null,
    chosen_at: row.chosen_at ? toIso(row.chosen_at) : null,
    updated_at: toIso(row.updated_at),
    view_count: Number(row.view_count ?? 0),
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function normaliseTheme(value: unknown): Theme {
  const raw = (typeof value === "string" ? safeParse(value) : value) as Partial<Theme> | null;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_THEME };
  return {
    layout: raw.layout === "list" ? "list" : "grid",
    palette: raw.palette,
    occasion: raw.occasion,
    font: raw.font,
    motif: raw.motif,
    cover: raw.cover,
    opening: raw.opening,
    effect: raw.effect,
    reply: raw.reply,
  };
}

function normaliseItems(value: unknown): Item[] {
  const raw = (typeof value === "string" ? safeParse(value) : value) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      id: String(o.id ?? ""),
      label: String(o.label ?? ""),
      image_url: (o.image_url as string | null) ?? null,
      source_url: (o.source_url as string | null) ?? null,
      note: (o.note as string | null) ?? null,
    };
  });
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

export async function findBySlug(slug: string): Promise<GiftPage | null> {
  const { rows } = await sql`SELECT * FROM gift_pages WHERE slug = ${slug} LIMIT 1`;
  return rows[0] ? rowToPage(rows[0]) : null;
}

export async function findByAdminToken(token: string): Promise<GiftPage | null> {
  const { rows } = await sql`SELECT * FROM gift_pages WHERE admin_token = ${token} LIMIT 1`;
  return rows[0] ? rowToPage(rows[0]) : null;
}

export async function slugExists(slug: string): Promise<boolean> {
  const { rows } = await sql`SELECT 1 FROM gift_pages WHERE slug = ${slug} LIMIT 1`;
  return rows.length > 0;
}

export async function incrementViewCount(id: string): Promise<void> {
  await sql`UPDATE gift_pages SET view_count = view_count + 1 WHERE id = ${id}::uuid`;
}
