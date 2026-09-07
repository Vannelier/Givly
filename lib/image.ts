/**
 * Réduction des images avant stockage.
 *
 * Une fiche produit fait couramment 1500 px de côté ; la vignette d'une carte
 * en mesure 385 en CSS, soit 1155 sur un écran à trois pixels par point. La
 * différence ne se voit pas, mais elle se paie deux fois : au téléchargement, et
 * surtout en mémoire — une image de 1500 × 1500 occupe 9 Mo une fois décodée,
 * quelle que soit la taille de son fichier. Dix cadeaux, et le téléphone porte
 * près de 90 Mo de bitmaps pour afficher des vignettes.
 *
 * On réduit donc une fois, au moment où l'image entre chez nous, plutôt qu'à
 * chaque affichage. Le format d'origine est conservé : convertir tout en WebP
 * ferait gagner quelques kilo-octets, mais l'image de couverture sert aussi
 * d'aperçu de lien, et tous les robots de messagerie ne lisent pas le WebP.
 */
import sharp from "sharp";

/** Côté le plus long, en pixels, d'une image stockée. */
export const MAX_IMAGE_EDGE = 1200;

const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;

/**
 * Réduit l'image si elle dépasse `MAX_IMAGE_EDGE`, sans jamais l'agrandir.
 *
 * Ne jette pas : une image que `sharp` ne sait pas lire (format exotique, fichier
 * tronqué) est renvoyée telle quelle. Refuser le téléversement pour un problème
 * de taille serait pire que stocker une image trop grande.
 */
export async function shrinkImage(
  data: ArrayBuffer | Buffer,
  contentType: string,
): Promise<{ data: Buffer; contentType: string }> {
  const input = Buffer.isBuffer(data) ? data : Buffer.from(data);

  try {
    const pipeline = sharp(input, { failOn: "none" });
    const meta = await pipeline.metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longest === 0) return { data: input, contentType };

    // Déjà à la bonne taille : on ne réencode pas pour rien, ce serait une
    // génération de perte gratuite.
    if (longest <= MAX_IMAGE_EDGE) return { data: input, contentType };

    const resized = pipeline.resize({
      width: MAX_IMAGE_EDGE,
      height: MAX_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });

    const out =
      contentType === "image/png"
        ? await resized.png({ compressionLevel: 9 }).toBuffer()
        : contentType === "image/webp"
          ? await resized.webp({ quality: WEBP_QUALITY }).toBuffer()
          : await resized.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();

    // Un réencodage qui alourdit le fichier n'a aucun intérêt : on garde
    // l'original. Le cas se produit sur les images déjà très compressées.
    if (out.length >= input.length) return { data: input, contentType };
    return { data: out, contentType };
  } catch {
    return { data: input, contentType };
  }
}
