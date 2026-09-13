import { adsensePublisherId } from "@/lib/env";

/*
 * ads.txt (norme IAB) : la liste des regies autorisees a vendre de l'espace
 * publicitaire sur le site. Une seule ligne, celle de Google AdSense.
 *
 * Sans identifiant, 404 — ni fichier vide, ni compte fictif. L'absence d'ads.txt
 * ne dit rien ; un fichier qui ne declare pas le bon compte ferait refuser les
 * annonces par Google.
 *
 * `f08c47fec0942fa0` est l'identifiant de Google aupres du TAG (Trustworthy
 * Accountability Group), le meme pour tous les editeurs AdSense.
 *
 * Lu a chaque requete plutot que fige au build : c'est la variable qui decide.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const id = adsensePublisherId();
  if (!id) return new Response("Not found", { status: 404 });
  return new Response(`google.com, ${id}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
