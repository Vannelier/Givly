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
 *
 * `/api/media/` non plus, et c'est capital : quand le stockage distant n'est pas
 * configuré, les images des cartes sont servies depuis cette adresse — y compris
 * celle que WhatsApp, Messenger et Google affichent dans l'aperçu du lien.
 * Interdire `/api/` en bloc, comme c'était le cas, revenait à interdire aux
 * messageries de télécharger l'image qu'on leur demande d'afficher. La règle la
 * plus spécifique l'emporte (RFC 9309) : `/api/media/` gagne sur `/api/`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/media/"],
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
