import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { baseUrl } from "./env";
import { shrinkImage } from "./image";

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

/**
 * Où le repli disque écrit ses images.
 *
 * `MEDIA_DIR` permet de pointer un volume persistant sans rien deviner. C'est
 * nécessaire dès qu'on héberge ailleurs que sur Vercel avec un volume monté :
 * le chemin par défaut dépend du répertoire de travail du conteneur, et monter
 * le volume à côté fait retomber dans la panne silencieuse — l'envoi réussit,
 * la carte s'affiche, et tout disparaît au déploiement suivant.
 *
 * Poser la variable vaut donc aussi déclaration d'intention : le stockage disque
 * est voulu et durable, l'avertissement au démarrage n'a plus lieu d'être.
 */
export const MEDIA_DIR = process.env.MEDIA_DIR?.trim()
  ? path.resolve(process.env.MEDIA_DIR.trim())
  : path.join(process.cwd(), ".media");

/** Vrai quand le dossier d'images a été désigné explicitement. */
export function mediaDirConfigured(): boolean {
  return Boolean(process.env.MEDIA_DIR?.trim());
}

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
  input: ArrayBuffer | Buffer,
  inputType: string,
  prefix = "gift",
): Promise<string> {
  // Reduite une fois ici, jamais a l'affichage : voir lib/image.ts.
  const { data, contentType } = await shrinkImage(input, inputType);
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
  await writeFile(path.join(MEDIA_DIR, name), data);

  // URL absolue : la validation exige http(s), et les balises Open Graph aussi.
  return `${baseUrl()}/api/media/${name}`;
}
