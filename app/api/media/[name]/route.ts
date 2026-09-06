import { readFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR, MEDIA_NAME, runningOnVercel } from "@/lib/mediaStore";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Sert les images du stockage de secours local. N'existe qu'en développement :
 * en production, les images vivent dans Vercel Blob et sont servies par lui.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (runningOnVercel()) return new Response("Introuvable", { status: 404 });

  const { name } = await params;
  // Le motif interdit tout separateur : pas de remontee de chemin possible.
  if (!MEDIA_NAME.test(name)) return new Response("Introuvable", { status: 404 });

  try {
    const data = await readFile(path.join(MEDIA_DIR, name));
    const extension = name.slice(name.lastIndexOf(".") + 1);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
