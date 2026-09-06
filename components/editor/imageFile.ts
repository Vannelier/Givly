"use client";

import { ALLOWED_IMAGE_TYPES, LIMITS } from "@/lib/limits";

export const ACCEPTED_IMAGE_TYPES: readonly string[] = ALLOWED_IMAGE_TYPES;
export const MAX_IMAGE_BYTES = LIMITS.imageBytes;
const MAX_EDGE = 1600;

/**
 * Réduit l'image côté navigateur avant l'envoi : les photos de téléphone font
 * facilement 8 Mo, la limite de payload serverless est plus basse, et une carte
 * cadeau n'a jamais besoin de plus de 1600 px. En cas d'échec (navigateur sans
 * OffscreenCanvas, image exotique), on renvoie le fichier d'origine tel quel.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 900_000) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/**
 * Recupere une image dans le presse-papiers : capture d'ecran, « copier l'image »
 * depuis une page web, ou fichier copie dans l'explorateur. Renvoie null si le
 * presse-papiers ne contient pas d'image exploitable.
 */
export function imageFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;

  for (const file of Array.from(data.files ?? [])) {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return file;
  }

  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file" || !ACCEPTED_IMAGE_TYPES.includes(item.type)) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
}

/** Une adresse d'image collee telle quelle, quand le presse-papiers ne porte que du texte. */
export function imageUrlFromClipboard(data: DataTransfer | null): string | null {
  const text = data?.getData("text/plain")?.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadImage(file: File): Promise<UploadResult> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "Formats acceptés : JPEG, PNG ou WebP." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "L'image ne doit pas dépasser 5 Mo." };
  }

  const prepared = await prepareImageForUpload(file);
  const body = new FormData();
  body.append("file", prepared);

  try {
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error ?? "Le téléversement a échoué." };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "Le téléversement a échoué. Vérifie ta connexion." };
  }
}
