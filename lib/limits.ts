/** Limites partagees serveur/client. Aucun import Node ici : ce module part dans le bundle navigateur. */
export const LIMITS = {
  name: 80,
  recipient: 60,
  intro: 80,
  signature: 80,
  message: 280,
  reply: 280,
  linkTitle: 80,
  itemLabel: 80,
  itemNote: 200,
  itemsMin: 1,
  itemsMax: 10,
  imageBytes: 5 * 1024 * 1024,
} as const;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
