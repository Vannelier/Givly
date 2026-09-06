/**
 * Applique db/schema.sql (et db/seed.sql avec --seed) sur la base pointee par
 * POSTGRES_URL_NON_POOLING (a defaut POSTGRES_URL).
 *
 *   npm run db:migrate
 *   npm run db:migrate -- --seed
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@vercel/postgres";

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

const client = createClient({ connectionString });
await client.connect();
try {
  for (const file of files) {
    process.stdout.write(`> ${file}\n`);
    await client.query(readFileSync(resolve(process.cwd(), file), "utf8"));
  }
  process.stdout.write("Migration terminee.\n");
} finally {
  await client.end();
}
