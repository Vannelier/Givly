/**
 * Applique le schéma avant de démarrer le serveur.
 *
 * `db/schema.sql` est idempotent — `CREATE TABLE IF NOT EXISTS`,
 * `ALTER TABLE … ADD COLUMN IF NOT EXISTS` — donc le rejouer à chaque démarrage
 * ne coûte rien et supprime une classe entière de problèmes : plus de migration
 * à lancer à la main depuis son poste, plus de déploiement qui sert une base
 * sans table.
 *
 * En JavaScript simple, et lancé avant Next : une première tentative passait par
 * `instrumentation.ts`, mais Next compile ce fichier aussi pour le runtime edge,
 * qui n'a ni `fs` ni `pg`. Ici, aucun bundler n'intervient.
 *
 * Ne bloque jamais le démarrage : si la base est injoignable, l'application se
 * lance quand même et répond 503 avec un message explicite. Refuser de démarrer
 * ferait boucler l'hébergeur sur des redémarrages sans rien expliquer.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Doit rester identique à `sslFor` dans lib/db.ts — `scripts/check.ts` vérifie
 * que les deux implémentations s'accordent.
 */
export function sslFor(url) {
  try {
    const host = new URL(url).hostname;
    const interne =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".internal") ||
      host.endsWith(".local");
    return interne ? undefined : { rejectUnauthorized: false };
  } catch {
    return undefined;
  }
}

export async function applySchema() {
  const url = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    console.warn("[givly] Aucune base configurée : schéma non appliqué.");
    return;
  }

  let schema;
  try {
    schema = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8");
  } catch {
    console.error("[givly] db/schema.sql introuvable : schéma non appliqué.");
    return;
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url, ssl: sslFor(url) });
  try {
    await client.connect();
    await client.query(schema);
    const { rows } = await client.query(
      "select count(*)::int as n from information_schema.columns where table_name = 'gift_pages'",
    );
    console.log(`[givly] Schéma à jour. gift_pages : ${rows[0].n} colonnes.`);
  } catch (err) {
    console.error("[givly] Schéma non appliqué :", err.message);
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Prévient quand les images n'ont nulle part où durer.
 *
 * Sans `BLOB_READ_WRITE_TOKEN`, le repli écrit dans `.media/`. C'est ce qu'on
 * veut en développement, mais sur un hébergeur au système de fichiers éphémère
 * — Railway, Fly, Render sans volume — **toutes les images disparaissent au
 * déploiement suivant** : les cadeaux d'une carte déjà envoyée cessent de
 * s'afficher, et l'aperçu du lien pointe vers un 404.
 *
 * Rien ne le signalait : l'envoi réussissait, la carte s'affichait, et la perte
 * n'apparaissait qu'au redéploiement d'après. D'où cet avertissement au
 * démarrage — il ne bloque rien, il nomme le piège.
 */
function verifierStockageImages() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return;
  if (process.env.NODE_ENV !== "production") return;

  for (const ligne of [
    "BLOB_READ_WRITE_TOKEN absent : les images sont ecrites dans .media/, sur le",
    "disque du conteneur. Si ce disque n'est pas un volume persistant, elles",
    "disparaitront au prochain deploiement — y compris celles des cartes deja",
    "envoyees. Configure le stockage distant, ou monte un volume sur .media/.",
  ]) {
    console.warn(`[givly] ${ligne}`);
  }
}

// Exécuté directement (et non importé par les vérifications) : on applique.
// Sans `await` au niveau du module, pour rester importable par les outils qui
// transposent en CommonJS.
if (process.argv[1] && process.argv[1].endsWith("boot.mjs")) {
  verifierStockageImages();
  applySchema().catch((err) => console.error("[givly]", err.message));
}
