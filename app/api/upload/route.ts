import { storageAvailable, storageUnavailableMessage, storeImage } from "@/lib/mediaStore";
import { fail, handleError, json } from "@/lib/http";
import { ALLOWED_IMAGE_TYPES, LIMITS } from "@/lib/limits";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Repli manuel : le donneur téléverse sa propre image.
 *
 * Le client réduit l'image avant l'envoi (voir components/editor/imageFile.ts),
 * ce qui garde le corps de requête bien sous la limite de payload serverless.
 * Les contrôles ci-dessous restent nécessaires : cette route est atteignable
 * directement.
 */
export async function POST(req: Request) {
  try {
    if (!storageAvailable()) {
      return fail(storageUnavailableMessage(), 503);
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return fail("Aucun fichier reçu.", 400, "file");
    }

    const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) {
      return fail("Formats acceptés : JPEG, PNG ou WebP.", 400, "file");
    }
    if (file.size === 0) return fail("Le fichier est vide.", 400, "file");
    if (file.size > LIMITS.imageBytes) {
      return fail(
        `L'image ne doit pas dépasser ${Math.round(LIMITS.imageBytes / (1024 * 1024))} Mo.`,
        400,
        "file",
      );
    }

    const url = await storeImage(await file.arrayBuffer(), type, "upload");
    return json({ url }, 201);
  } catch (err) {
    return handleError(err);
  }
}
