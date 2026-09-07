import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/env";

/**
 * Les pages publiques, et elles seules : les pages-cadeau sont privées et
 * marquées `noindex`, les inscrire ici reviendrait à publier la liste des liens
 * envoyés.
 *
 * Les mentions légales n'y figurent pas non plus — elles portent `noindex` : une
 * page d'identité de l'éditeur n'a rien à faire dans un index de recherche, mais
 * elle reste atteignable par le pied de page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  const pages: [chemin: string, priorite: number][] = [
    ["/", 1],
    ["/creer", 0.9],
    ["/questions", 0.8],
    ["/contact", 0.4],
    ["/confidentialite", 0.3],
    ["/conditions", 0.3],
  ];

  return pages.map(([chemin, priority]) => ({
    url: `${base}${chemin}`,
    changeFrequency: "monthly",
    priority,
  }));
}
