import { findBySlug, sql } from "@/lib/db";
import { fail, handleError, json, readJson, tropDeRequetes } from "@/lib/http";
import { QUOTAS } from "@/lib/rateLimit";
import { isExpired, isLocked, isSealed } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    // Le verrou metier empeche deja de choisir deux fois. Le quota, lui, ferme
    // l'enumeration : sans lui, cette route dit gratuitement quels slugs existent.
    const trop = tropDeRequetes(req, QUOTAS.reponse, "choix");
    if (trop) return trop;

    const { slug } = await params;
    const body = (await readJson(req)) as { itemId?: unknown };
    const itemId = typeof body?.itemId === "string" ? body.itemId : null;
    if (!itemId) return fail("Aucun cadeau sélectionné.", 400, "itemId");

    const page = await findBySlug(slug);
    if (!page) return fail("Cette page n'existe pas.", 404);
    if (isExpired(page)) return fail("Ce cadeau n'est plus disponible : le lien a expiré.", 409);
    if (isLocked(page)) return fail("Un choix a déjà été enregistré pour cette page.", 409);
    // Le verrou est aussi cote serveur : le compte a rebours du navigateur ne
    // suffit pas, on ne veut pas qu'une requete directe ouvre la carte en avance.
    if (isSealed(page)) return fail("Cette carte n'est pas encore ouverte.", 409);
    if (!page.items.some((i) => i.id === itemId)) {
      return fail("Ce cadeau ne fait pas partie de la page.", 400, "itemId");
    }

    // Le garde `chosen_at IS NULL` dans le WHERE rend le verrouillage atomique :
    // deux confirmations simultanées ne peuvent pas toutes les deux gagner.
    //
    // Le mot du receveur ne passe plus par ici : il est proposé une fois le choix
    // confirmé, et arrive par `POST /api/pages/[slug]/reply`.
    const { rowCount } = await sql`
      UPDATE gift_pages
         SET chosen_item_id = ${itemId},
             chosen_at      = now()
       WHERE id = ${page.id}::uuid
         AND chosen_at IS NULL
    `;
    if (rowCount === 0) {
      return fail("Un choix a déjà été enregistré pour cette page.", 409);
    }

    return json({ ok: true, thank_you_message: page.thank_you_message });
  } catch (err) {
    return handleError(err);
  }
}
