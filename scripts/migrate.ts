/**
 * Applique db/schema.sql (et db/seed.sql avec --seed) sur la base pointée par
 * POSTGRES_URL_NON_POOLING (à défaut POSTGRES_URL).
 *
 *   npm run db:migrate
 *   npm run db:migrate -- --seed
 *
 * Sur Railway : `railway run npm run db:migrate` depuis un projet lié, pour que
 * les variables de l'environnement distant soient injectées.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { sslFor } from "../lib/db";

function loadEnvFile(name: string) {
  try {
    const text = readFileSync(resolve(process.cwd(), name), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key]) continue;
      process.env[key] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fichier absent : on se contente de l'environnement du process */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL_NON_POOLING (ou POSTGRES_URL) est absent. Voir .env.example.");
  process.exit(1);
}

const files = ["db/schema.sql", ...(process.argv.includes("--seed") ? ["db/seed.sql"] : [])];

/*
 * Tout passe par une fonction plutot que par du `await` au niveau du module.
 *
 * `package.json` ne declare pas `"type": "module"`, donc tsx transpile ce
 * fichier .ts en CommonJS, ou le `await` de premier niveau n'existe pas : le
 * script echouait a la transformation, avant meme d'avoir lu la configuration.
 * C'est pour la meme raison que scripts/boot.mjs porte l'extension .mjs.
 */
async function main(url: string) {
  const client = new Client({ connectionString: url, ssl: sslFor(url) });
  await client.connect();
  try {
    const { rows } = await client.query("select current_database() as base, version() as v");
    process.stdout.write(`base : ${rows[0].base}\n`);

    for (const file of files) {
      process.stdout.write(`> ${file}\n`);
      await client.query(readFileSync(resolve(process.cwd(), file), "utf8"));
    }

    const { rows: cols } = await client.query(
      "select count(*)::int as n from information_schema.columns where table_name = 'gift_pages'",
    );
    process.stdout.write(`Migration terminée. gift_pages : ${cols[0].n} colonnes.\n`);
  } finally {
    await client.end();
  }
}

// L'adresse est passée en argument : le contrôle ci-dessus a déjà écarté le cas
// `undefined`, mais cette garantie ne franchit pas la frontière d'une fonction.
main(connectionString).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
