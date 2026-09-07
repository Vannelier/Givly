import type { MetadataRoute } from "next";

/**
 * Le manifeste sert deux choses ici.
 *
 * D'abord Android, qui y prend l'icône quand on épingle le site sur l'écran
 * d'accueil. Ensuite les moteurs de recherche : Google accepte l'icône déclarée
 * dans un manifeste au même titre qu'un `<link rel="icon">`, et il lui faut une
 * image carrée dont le côté est un multiple de 48 — d'où 192 et 512.
 *
 * L'entrée `maskable` est distincte : Android rogne l'icône jusqu'à 20 % de
 * chaque bord pour la mettre à la forme du système, et la version courante y
 * perdrait le couvercle du paquet.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Givly — offre le choix",
    short_name: "Givly",
    description: "Compose une petite page-cadeau, envoie le lien, laisse la personne choisir.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#b0533c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
