import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/env";

/**
 * Deux adresses, et c'est tout : les pages-cadeau sont privées et marquées
 * `noindex`, les inscrire ici reviendrait à publier la liste des liens envoyés.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/creer`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
