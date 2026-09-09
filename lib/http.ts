import { NextResponse } from "next/server";
import { DbNotConfiguredError } from "./db";
import {
  adresseClient,
  consomme,
  limitationDesactivee,
  type Quota,
} from "./rateLimit";
import { ValidationError } from "./validation";

export function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function fail(message: string, status: number, field?: string) {
  return NextResponse.json({ error: message, field }, { status });
}

/** 404 muet : ne jamais révéler l'existence d'une page derrière un token admin. */
export function notFoundJson() {
  return fail("Introuvable.", 404);
}

/**
 * Applique un quota à la requête. Renvoie une réponse 429 quand il est dépassé,
 * `null` quand la route peut continuer — de sorte qu'un appel se lise en une
 * ligne en tête de handler :
 *
 *     const trop = tropDeRequetes(req, QUOTAS.creation);
 *     if (trop) return trop;
 *
 * `Retry-After` est renseigné : c'est ce que lisent les clients bien élevés, et
 * ça évite qu'un navigateur reboucle immédiatement.
 *
 * `portee` sépare les compteurs de deux routes qui partagent un même quota, et
 * sert aussi à poser un plafond global en passant une clé constante.
 */
export function tropDeRequetes(
  req: Request,
  quota: Quota,
  portee: string,
  cle = adresseClient(req),
): NextResponse | null {
  if (limitationDesactivee()) return null;

  const verdict = consomme(quota, `${portee}:${cle}`);
  if (verdict.ok) return null;

  return NextResponse.json(
    {
      error:
        "Trop de requêtes en peu de temps. Reprends dans quelques minutes — c'est une protection contre les abus, pas contre toi.",
    },
    { status: 429, headers: { "Retry-After": String(verdict.retryAfterS) } },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Corps de requête illisible : JSON attendu.");
  }
}

/** Convertit une ValidationError en 400 exploitable côté UI ; le reste en 500 muet. */
export function handleError(err: unknown) {
  if (err instanceof ValidationError) {
    return fail(err.message, 400, err.field);
  }
  if (err instanceof DbNotConfiguredError) {
    console.error("[mypresentsforyou]", err.message);
    return fail("Base de données non configurée sur ce déploiement.", 503);
  }
  console.error("[mypresentsforyou]", err);
  return fail("Une erreur inattendue est survenue.", 500);
}
