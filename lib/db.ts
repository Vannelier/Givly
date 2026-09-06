/**
 * Unique point de contact avec Postgres.
 *
 * `@vercel/postgres` lit POSTGRES_URL / POSTGRES_URL_NON_POOLING tout seul.
 * Le paquet est deprecie au profit du driver Neon : si un jour il faut migrer,
 * c'est ce fichier — et lui seul — qui change (meme API de template tague).
 */
import { sql } from "@vercel/postgres";
import type { GiftPage, Item, Theme } from "./types";
import { DEFAULT_THEME } from "./types";

export { sql };

export class DbNotConfiguredError extends Error {
  constructor() {
    super(
      "POSTGRES_URL est absent. Renseigne les variables Vercel Postgres (voir .env.example), " +
        "puis applique le schema avec `npm run db:migrate`.",
    );
    this.name = "DbNotConfiguredError";
  }
}

/** Distingue « base non configuree » d'une vraie panne : le message n'est pas le meme. */
function assertConfigured() {
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
    throw new DbNotConfiguredError();
  }
}

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
    welcome_message: String(row.welcome_message ?? ""),
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

export async function findBySlug(slug: string): Promise<GiftPage | null> {
  assertConfigured();
  const { rows } = await sql`SELECT * FROM gift_pages WHERE slug = ${slug} LIMIT 1`;
  return rows[0] ? rowToPage(rows[0] as Row) : null;
}

export async function findByAdminToken(token: string): Promise<GiftPage | null> {
  assertConfigured();
  const { rows } = await sql`SELECT * FROM gift_pages WHERE admin_token = ${token} LIMIT 1`;
  return rows[0] ? rowToPage(rows[0] as Row) : null;
}

export async function slugExists(slug: string): Promise<boolean> {
  assertConfigured();
  const { rows } = await sql`SELECT 1 FROM gift_pages WHERE slug = ${slug} LIMIT 1`;
  return rows.length > 0;
}

export async function incrementViewCount(id: string): Promise<void> {
  assertConfigured();
  await sql`UPDATE gift_pages SET view_count = view_count + 1 WHERE id = ${id}::uuid`;
}
