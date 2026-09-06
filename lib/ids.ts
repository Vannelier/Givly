import { randomBytes } from "node:crypto";

/** Secret admin : 32 octets aleatoires en base64url. Seule protection de /admin. */
export function newAdminToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newItemId(): string {
  return `itm_${randomBytes(4).toString("hex")}`;
}
