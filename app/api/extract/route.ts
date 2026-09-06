import { extractFromUrl } from "@/lib/extract";
import { json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Best-effort, ne renvoie jamais d'erreur au client : un échec est un
 * `{ ok: false }` qui fait basculer l'UI sur le repli manuel — chemin nominal.
 */
export async function POST(req: Request) {
  let url = "";
  try {
    const body = (await readJson(req)) as { url?: unknown };
    url = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    return json({ ok: false });
  }
  if (!url) return json({ ok: false });

  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return json(await extractFromUrl(withScheme));
}
