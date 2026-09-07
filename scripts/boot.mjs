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
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

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
 * Doit rester identique à `MEDIA_DIR` dans lib/mediaStore.ts — `scripts/check.ts`
 * vérifie que les deux implémentations s'accordent.
 */
export function mediaDir() {
  const explicite = process.env.MEDIA_DIR && process.env.MEDIA_DIR.trim();
  return explicite ? resolve(explicite) : resolve(process.cwd(), ".media");
}

/**
 * Dit où atterrissent les images, et prévient quand elles n'ont nulle part où
 * durer.
 *
 * Sans `BLOB_READ_WRITE_TOKEN`, le repli écrit sur le disque. C'est ce qu'on veut
 * en développement, mais sur un hébergeur au système de fichiers éphémère —
 * Railway, Fly, Render sans volume — **toutes les images disparaissent au
 * déploiement suivant** : les cadeaux d'une carte déjà envoyée cessent de
 * s'afficher, et l'aperçu du lien pointe vers un 404.
 *
 * Rien ne le signalait : l'envoi réussissait, la carte s'affichait, et la perte
 * n'apparaissait qu'au redéploiement d'après. D'où cette vérification — elle ne
 * bloque rien, elle nomme le piège et donne le chemin exact à comparer au point
 * de montage.
 */
async function verifierStockageImages() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("[givly] Images : stockage distant configure.");
    return;
  }

  // On ecrit reellement : c'est la seule facon de savoir si le volume est monte
  // la ou l'application ecrit, et s'il est accessible en ecriture. Un montage
  // pose a cote passerait sinon inapercu jusqu'au deploiement suivant.
  const dossier = mediaDir();
  try {
    await mkdir(dossier, { recursive: true });
    const sonde = join(dossier, ".ecriture-test");
    await writeFile(sonde, "");
    await rm(sonde, { force: true });
  } catch (err) {
    console.error(`[givly] Images : ${dossier} n'est pas accessible en ecriture — ${err.message}`);
    console.error("[givly] Les televersements echoueront. Verifie le montage et ses droits.");
    return;
  }

  console.log(`[givly] Images : dossier ${dossier}.`);

  /*
   * Pas de garde sur NODE_ENV : ce script tourne avant Next, qui n'a donc pas
   * encore pose la variable — l'avertissement risquait de ne jamais s'afficher
   * la ou il sert. Il ne peut de toute facon se declencher qu'au demarrage de
   * production, `npm run dev` ne passant pas par ici.
   */
  if (!process.env.MEDIA_DIR) {
    for (const ligne of [
      "Ce dossier suit le conteneur, pas un volume : si rien n'est monte dessus,",
      "les images disparaitront au prochain deploiement, y compris celles des",
      "cartes deja envoyees. Monte un volume et pointe-le avec MEDIA_DIR, ou",
      "configure BLOB_READ_WRITE_TOKEN.",
    ]) {
      console.warn(`[givly] ${ligne}`);
    }
  }
}

// Exécuté directement (et non importé par les vérifications) : on applique.
// Sans `await` au niveau du module, pour rester importable par les outils qui
// transposent en CommonJS.
if (process.argv[1] && process.argv[1].endsWith("boot.mjs")) {
  verifierStockageImages()
    .catch((err) => console.error("[givly]", err.message))
    .then(() => applySchema())
    .catch((err) => console.error("[givly]", err.message));
}
