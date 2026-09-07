import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/env";

/**
 * Les pages-cadeau restent explorables : elles portent déjà `noindex`, et c'est
 * justement en les parcourant qu'un robot peut le lire. Les interdire ici aurait
 * l'effet inverse — l'adresse resterait indexable, sans que personne n'ait pu
 * voir la consigne.
 *
 * L'administration, elle, est bloquée : un jeton d'administration n'a rien à
 * faire dans un index, et rien ne justifie qu'un robot le suive.
 *
 * Rien ne bloque `/favicon.ico` ni `/icon.svg` : Google refuse d'afficher une
 * icône qu'il n'a pas le droit de télécharger.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
