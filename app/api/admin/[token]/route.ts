import { findByAdminToken, rowToPage, sql } from "@/lib/db";
import { mirrorCover, mirrorItemImages, type ImageWarning } from "@/lib/blob";
import { fail, handleError, json, notFoundJson, readJson } from "@/lib/http";
import { isExpired, isLocked } from "@/lib/types";
import { validatePatch } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ token: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const page = await findByAdminToken(token);
    if (!page) return notFoundJson();

    if (isLocked(page)) {
      return fail("Le choix a été fait : la page n'est plus modifiable.", 409);
    }
    if (isExpired(page)) {
      return fail("La page a expiré : elle n'est plus modifiable.", 409);
    }

    const patch = validatePatch(await readJson(req));
    const warnings: ImageWarning[] = [];

    let items = page.items;
    if (patch.items) {
      const mirrored = await mirrorItemImages(patch.items);
      items = mirrored.items;
      warnings.push(...mirrored.warnings);
    }

    let cover = page.cover_image_url;
    if ("cover_image_url" in patch) {
      const mirrored = await mirrorCover(patch.cover_image_url ?? null);
      cover = mirrored.cover_image_url;
      warnings.push(...mirrored.warnings);
    }

    let header = page.header_image_url;
    if ("header_image_url" in patch) {
      const mirrored = await mirrorCover(patch.header_image_url ?? null);
      header = mirrored.cover_image_url;
      warnings.push(...mirrored.warnings);
    }

    const name = patch.name ?? page.name;
    const intro = patch.intro_message ?? page.intro_message;
    const signature = patch.signature ?? page.signature;
    const recipient = patch.recipient_name ?? page.recipient_name;
    const revealAt = "reveal_at" in patch ? patch.reveal_at ?? null : page.reveal_at;
    const welcome = patch.welcome_message ?? page.welcome_message;
    const thanks = patch.thank_you_message ?? page.thank_you_message;
    const theme = patch.theme ?? page.theme;

    // `chosen_at IS NULL` de nouveau ici : entre la lecture et l'écriture, le
    // receveur a pu confirmer son choix. Dans ce cas on n'écrase rien.
    const { rows } = await sql`
      UPDATE gift_pages
         SET name              = ${name},
             intro_message     = ${intro},
             signature         = ${signature},
             recipient_name    = ${recipient},
             header_image_url  = ${header},
             reveal_at         = ${revealAt},
             welcome_message   = ${welcome},
             thank_you_message = ${thanks},
             cover_image_url   = ${cover},
             theme             = ${JSON.stringify(theme)}::jsonb,
             items             = ${JSON.stringify(items)}::jsonb,
             updated_at        = now()
       WHERE id = ${page.id}::uuid
         AND chosen_at IS NULL
      RETURNING *
    `;
    if (rows.length === 0) {
      return fail("Le choix vient d'être fait : la page n'est plus modifiable.", 409);
    }

    const updated = rowToPage(rows[0]);
    return json({
      ok: true,
      warnings,
      page: {
        name: updated.name,
        intro_message: updated.intro_message,
        signature: updated.signature,
        recipient_name: updated.recipient_name,
        header_image_url: updated.header_image_url,
        reveal_at: updated.reveal_at,
        welcome_message: updated.welcome_message,
        thank_you_message: updated.thank_you_message,
        cover_image_url: updated.cover_image_url,
        theme: updated.theme,
        items: updated.items,
        updated_at: updated.updated_at,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const { rowCount } = await sql`DELETE FROM gift_pages WHERE admin_token = ${token}`;
    if (rowCount === 0) return notFoundJson();
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
