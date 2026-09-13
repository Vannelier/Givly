import { rowToPage, slugExists, sql } from "@/lib/db";
import { mirrorCover, mirrorItemImages, type ImageWarning } from "@/lib/blob";
import { adminUrlFor, freePageTtlDays, publicUrlFor } from "@/lib/env";
import { fail, handleError, json, readJson, tropDeRequetes } from "@/lib/http";
import { QUOTAS } from "@/lib/rateLimit";
import { newAdminToken } from "@/lib/ids";
import { suggestVariant } from "@/lib/slug";
import { validateCreate } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // La route la plus couteuse du site : une insertion, la recopie des images
    // vers le stockage, et une page qui vivra un an. Deux garde-fous —
    // un par adresse, et un plafond global qui tient meme si l'abus est reparti
    // sur beaucoup d'adresses.
    const trop =
      tropDeRequetes(req, QUOTAS.creation, "creation") ??
      tropDeRequetes(req, QUOTAS.creationGlobale, "creation-globale", "tous");
    if (trop) return trop;

    const input = validateCreate(await readJson(req));

    // Une carte qui se revele apres son expiration ne s'ouvrirait jamais.
    if (input.reveal_at && new Date(input.reveal_at).getTime() >= Date.now() + freePageTtlDays() * 86_400_000) {
      return fail(
        `La date de révélation doit tomber avant l'expiration de la page, dans ${freePageTtlDays()} jours.`,
        400,
        "reveal_at",
      );
    }

    // L'adresse n'est plus modifiable depuis le formulaire : une collision doit
    // donc se resoudre toute seule, sinon plus personne ne peut la corriger.
    const slug = await freeSlug(input.slug);
    if (!slug) {
      return fail(
        "Trop de cartes portent déjà ce nom. Change le nom de la carte.",
        409,
        "name",
      );
    }

    const [
      { items, warnings: itemWarnings },
      { cover_image_url, warnings: coverWarnings },
      header,
    ] = await Promise.all([
      mirrorItemImages(input.items),
      mirrorCover(input.cover_image_url),
      mirrorCover(input.header_image_url),
    ]);
    const header_image_url = header.cover_image_url;
    const warnings: ImageWarning[] = [...coverWarnings, ...header.warnings, ...itemWarnings];

    const admin_token = newAdminToken();
    // Le MVP ne traite que le plan `free` : la colonne `plan` existe pour la
    // suite, mais rien ne peut encore produire une page `paid`.
    const expiresAt = new Date(Date.now() + freePageTtlDays() * 86_400_000).toISOString();

    let inserted;
    try {
      inserted = await sql`
        INSERT INTO gift_pages
          (slug, admin_token, name, intro_message, signature, recipient_name,
           header_image_url, reveal_at, link_title, welcome_message, open_label,
           wait_message, items_title, items_message, thank_you_message,
           cover_image_url, theme, items, plan, expires_at)
        VALUES
          (${slug}, ${admin_token}, ${input.name}, ${input.intro_message}, ${input.signature},
           ${input.recipient_name}, ${header_image_url}, ${input.reveal_at}, ${input.link_title},
           ${input.welcome_message}, ${input.open_label}, ${input.wait_message},
           ${input.items_title}, ${input.items_message}, ${input.thank_you_message},
           ${cover_image_url}, ${JSON.stringify(input.theme)}::jsonb,
           ${JSON.stringify(items)}::jsonb, 'free', ${expiresAt})
        RETURNING *
      `;
    } catch (err) {
      // Collision gagnee par une creation concurrente entre le test et l'INSERT.
      if (isUniqueViolation(err)) {
        return fail("Réessaie : une autre carte vient de prendre cette adresse.", 409, "name");
      }
      throw err;
    }

    const page = rowToPage(inserted.rows[0]);
    return json(
      {
        slug: page.slug,
        publicUrl: publicUrlFor(page.slug),
        adminUrl: adminUrlFor(page.admin_token),
        expiresAt: page.expires_at,
        warnings,
      },
      201,
    );
  } catch (err) {
    return handleError(err);
  }
}

/** Le slug demande, ou la premiere variante libre : `noel-de-sophie-2`, `-3`... */
async function freeSlug(base: string): Promise<string | null> {
  if (!(await slugExists(base))) return base;
  for (let n = 2; n <= 40; n++) {
    const candidate = suggestVariant(base, n);
    if (!(await slugExists(candidate))) return candidate;
  }
  return null;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
