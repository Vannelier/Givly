import { paletteById, paletteIdOf } from "./palettes";

/**
 * La couleur de la carte imprimable, réglable à la teinte.
 *
 * Un curseur, et non un second sélecteur de palettes. La carte n'a pas besoin
 * des huit palettes de la page-cadeau : elle est en noir sur papier, et la seule
 * chose colorée y est l'accent — le prénom, le filet du cadre, et le décor semé
 * derrière. Faire tourner cette teinte-là suffit, et un curseur le dit mieux
 * qu'une grille de pastilles.
 *
 * **Seule la teinte tourne.** Saturation et clarté restent celles de la palette
 * d'origine, couleur par couleur : c'est ce qui garde la carte dans le registre
 * papier de tout le site au lieu de la faire virer au fluo. Une palette sourde
 * reste sourde quel que soit l'angle choisi.
 *
 * Aucun import Node : ce module part dans le bundle navigateur.
 */

export type Hsl = { h: number; s: number; l: number };

/** Les variables dont la teinte suit le curseur. Le reste du thème ne bouge pas. */
const VARIABLES_TEINTEES = [
  "--accent",
  "--accent-dark",
  "--accent-soft",
  "--paper-warm",
  "--line",
] as const;

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const v = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, v, b);
  const min = Math.min(r, v, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((v - b) / d + (v < b ? 6 : 0)) / 6;
  else if (max === v) h = ((b - r) / d + 2) / 6;
  else h = ((r - v) / d + 4) / 6;

  return { h: h * 360, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, v, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const pad = (u: number) =>
    Math.round((u + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${pad(r)}${pad(v)}${pad(b)}`;
}

/** La teinte de l'accent du thème : la position de départ du curseur. */
export function teinteDuTheme(palette: Record<string, string> | undefined): number {
  const accent = paletteById(paletteIdOf(palette)).vars["--accent"];
  return Math.round(hexToHsl(accent)?.h ?? 0);
}

/**
 * Les variables à surcharger pour amener la carte sur une teinte donnée.
 *
 * Renvoie un objet vide quand le curseur est resté sur la teinte du thème :
 * mieux vaut ne rien surcharger du tout que réécrire les mêmes couleurs à un
 * arrondi près, et cela garantit qu'une carte qu'on n'a pas touchée est
 * exactement celle de la page-cadeau.
 */
export function styleDeTeinte(
  palette: Record<string, string> | undefined,
  teinte: number,
): React.CSSProperties {
  const vars = paletteById(paletteIdOf(palette)).vars;
  const depart = teinteDuTheme(palette);
  const cible = ((Math.round(teinte) % 360) + 360) % 360;
  if (cible === depart) return {};

  const out: Record<string, string> = {};
  for (const nom of VARIABLES_TEINTEES) {
    const hsl = hexToHsl(vars[nom] ?? "");
    // Un gris pur n'a pas de teinte a faire tourner : le decaler le colorerait
    // sans qu'on l'ait demande.
    if (!hsl || hsl.s === 0) continue;
    out[nom] = hslToHex({ ...hsl, h: cible });
  }
  return out as React.CSSProperties;
}
