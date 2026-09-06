import { rowToPage, slugExists, sql } from "@/lib/db";
import { mirrorCover, mirrorItemImages, type ImageWarning } from "@/lib/blob";
import { adminUrlFor, freePageTtlDays, publicUrlFor } from "@/lib/env";
import { fail, handleError, json, readJson } from "@/lib/http";
import { newAdminToken } from "@/lib/ids";
import { suggestVariant } from "@/lib/slug";
import { validateCreate } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const input = validateCreate(await readJson(req));

    // Une carte qui se revele apres son expiration ne s'ouvrirait jamais.
    if (input.reveal_at && new Date(input.reveal_at).getTime() >= Date.now() + freePageTtlDays() * 86_400_000) {
      return fail(
        `La date de révélation doit tomber avant l'expiration de la page, dans ${freePageTtlDays()} jours.`,
        400,
        "reveal_at",
      );
    }

    if (await slugExists(input.slug)) {
      return slugTaken(input.slug);
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
           header_image_url, reveal_at, welcome_message, thank_you_message,
           cover_image_url, theme, items, plan, expires_at)
        VALUES
          (${input.slug}, ${admin_token}, ${input.name}, ${input.intro_message}, ${input.signature},
           ${input.recipient_name}, ${header_image_url}, ${input.reveal_at},
           ${input.welcome_message}, ${input.thank_you_message}, ${cover_image_url},
           ${JSON.stringify(input.theme)}::jsonb,
           ${JSON.stringify(items)}::jsonb, 'free', ${expiresAt})
        RETURNING *
      `;
    } catch (err) {
      // Collision gagnée par une création concurrente entre le check et l'INSERT.
      if (isUniqueViolation(err)) return slugTaken(input.slug);
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

async function slugTaken(slug: string) {
  const suggestion = await firstFreeVariant(slug);
  return fail(
    suggestion
      ? `L'adresse « ${slug} » est déjà prise. « ${suggestion} » est libre.`
      : `L'adresse « ${slug} » est déjà prise.`,
    409,
    "slug",
  );
}

async function firstFreeVariant(slug: string): Promise<string | null> {
  for (let n = 2; n <= 9; n++) {
    const candidate = suggestVariant(slug, n);
    if (!(await slugExists(candidate))) return candidate;
  }
  return null;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
