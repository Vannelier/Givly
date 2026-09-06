import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { baseUrl } from "./env";

/**
 * Où atterrissent les images.
 *
 * En production, Vercel Blob. En développement, un dossier local : sans ce
 * repli, rien de ce qui touche aux images ne fonctionne tant qu'on n'a pas de
 * compte Vercel — ni le téléversement, ni le collage, ni la recopie des images
 * de marchands. C'était le bug : `/api/upload` répondait 503 en silence.
 *
 * Le repli disque est refusé sur Vercel, dont le système de fichiers est
 * éphémère : une image écrite là disparaîtrait au déploiement suivant.
 */

export const MEDIA_DIR = path.join(process.cwd(), ".media");

/** Nom de fichier accepté par la route de service. Volontairement étroit. */
export const MEDIA_NAME = /^[a-z0-9-]+\.(jpg|png|webp)$/;

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function runningOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Un stockage est disponible d'une manière ou d'une autre. */
export function storageAvailable(): boolean {
  return blobConfigured() || !runningOnVercel();
}

export function storageUnavailableMessage(): string {
  return runningOnVercel()
    ? "Le stockage d'images n'est pas configuré sur ce déploiement (BLOB_READ_WRITE_TOKEN). Colle plutôt une URL d'image."
    : "Le stockage d'images n'est pas disponible. Colle plutôt une URL d'image.";
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function storeImage(
  data: ArrayBuffer | Buffer,
  contentType: string,
  prefix = "gift",
): Promise<string> {
  const extension = extensionFor(contentType);

  if (blobConfigured()) {
    const blob = await put(`${prefix}/${Date.now()}.${extension}`, data, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (runningOnVercel()) {
    throw new Error("Aucun stockage d'images disponible.");
  }

  const safePrefix = prefix.replace(/[^a-z0-9]/gi, "").toLowerCase() || "img";
  const name = `${safePrefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.${extension}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(path.join(MEDIA_DIR, name), Buffer.from(data as ArrayBuffer));

  // URL absolue : la validation exige http(s), et les balises Open Graph aussi.
  return `${baseUrl()}/api/media/${name}`;
}
