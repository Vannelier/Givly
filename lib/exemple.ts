import { ITEMS_MESSAGE_HINT, ITEMS_TITLE_HINT, occasionById } from "./occasions";
import type { PublicPage } from "./types";

/*
 * La page-cadeau que montre /exemple. Figee, jamais en base : la demonstration
 * de db/seed.sql est une vraie carte, et le premier visiteur qui y choisirait un
 * cadeau la verrouillerait pour tous les suivants.
 *
 * Les textes sont ceux que propose l'occasion, lus ici et non recopies :
 * l'exemple montre ce qu'on obtient sans rien ecrire, et suit toute retouche de
 * ces formules. Les prenoms sont epicenes, et les cadeaux melent experiences et
 * objets — la neutralite ne s'arrete pas a eux.
 */
const anniversaire = occasionById("anniversaire");

export const EXEMPLE: PublicPage = {
  slug: "exemple",
  recipient_name: "Camille",
  intro_message: anniversaire.intro,
  welcome_message: anniversaire.welcomeHint,
  open_label: anniversaire.openHint,
  wait_message: anniversaire.waitHint,
  items_title: ITEMS_TITLE_HINT,
  items_message: ITEMS_MESSAGE_HINT,
  thank_you_message: anniversaire.thanksHint,
  signature: "Sacha",
  reply_message: "",
  header_image_url: null,
  reveal_at: null,
  theme: {
    layout: "grid",
    palette: { id: anniversaire.palette },
    occasion: anniversaire.id,
    motif: anniversaire.motif !== "none",
    effect: anniversaire.effect,
    // Le mot du receveur est active pour que le parcours se voie en entier.
    reply: true,
  },
  items: [
    {
      id: "exemple-parachute",
      label: "Un saut en parachute",
      note: "En tandem avec un moniteur. Tu choisis le jour.",
      image_url: "/exemple/parachute.jpg",
      source_url: null,
    },
    {
      id: "exemple-appareil-photo",
      label: "Un appareil photo instantané",
      note: "Et trois recharges pour commencer.",
      image_url: "/exemple/appareil-photo.jpg",
      source_url: null,
    },
    {
      id: "exemple-restaurant",
      label: "Un dîner au restaurant",
      note: "Une table pour deux, là où tu en as envie.",
      image_url: "/exemple/restaurant.jpg",
      source_url: null,
    },
    {
      id: "exemple-casque",
      label: "Un casque audio sans fil",
      note: "Pour tes trajets, et le calme qui va avec.",
      image_url: "/exemple/casque.jpg",
      source_url: null,
    },
  ],
  chosen_item_id: null,
  chosen_at: null,
};
