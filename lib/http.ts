import { NextResponse } from "next/server";
import { DbNotConfiguredError } from "./db";
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
    console.error("[givly]", err.message);
    return fail("Base de données non configurée sur ce déploiement.", 503);
  }
  console.error("[givly]", err);
  return fail("Une erreur inattendue est survenue.", 500);
}
