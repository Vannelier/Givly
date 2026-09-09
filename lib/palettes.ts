/**
 * Palettes de la page-cadeau. Aucun import Node : ce module part dans le bundle
 * navigateur (l'aperçu du formulaire s'en sert autant que la page publique).
 *
 * En base, `theme.palette` ne garde que `{ id }` : les valeurs vivent ici, donc
 * retoucher une couleur met à jour toutes les pages déjà créées.
 */

export type PaletteId =
  | "terracotta"
  | "olive"
  | "encre"
  | "prune"
  | "sapin"
  | "rose"
  | "brume"
  | "ivoire"
  | "noisette";

export type Palette = {
  id: PaletteId;
  name: string;
  /** Aperçu dans le sélecteur : accent, fond, encre. */
  swatch: [string, string, string];
  vars: Record<string, string>;
};

export const PALETTES: Palette[] = [
  {
    id: "terracotta",
    name: "Terracotta",
    swatch: ["#b0533c", "#f4ece1", "#231f1c"],
    vars: {
      "--paper": "#faf6f0",
      "--paper-warm": "#f4ece1",
      "--card": "#fffdfa",
      "--ink": "#231f1c",
      "--ink-soft": "#6f6259",
      "--ink-faint": "#a3958a",
      "--line": "#e8ded2",
      "--accent": "#b0533c",
      "--accent-dark": "#8e4130",
      "--accent-soft": "#f5e6df",
      "--thumb-a": "#f4ece1",
      "--thumb-b": "#e9dcca",
      "--glow-a": "rgba(176, 83, 60, 0.09)",
      "--glow-b": "rgba(200, 165, 110, 0.12)",
    },
  },
  {
    id: "olive",
    name: "Olive",
    swatch: ["#5f7746", "#eceedf", "#1f2419"],
    vars: {
      "--paper": "#f7f8f0",
      "--paper-warm": "#eceedf",
      "--card": "#fdfdf8",
      "--ink": "#1f2419",
      "--ink-soft": "#5b6551",
      "--ink-faint": "#949e87",
      "--line": "#e0e4d3",
      "--accent": "#5f7746",
      "--accent-dark": "#4a5f36",
      "--accent-soft": "#e7eddc",
      "--thumb-a": "#eceedf",
      "--thumb-b": "#dbe0c6",
      "--glow-a": "rgba(95, 119, 70, 0.10)",
      "--glow-b": "rgba(190, 200, 140, 0.14)",
    },
  },
  {
    id: "encre",
    name: "Encre",
    swatch: ["#3a5a8c", "#e6ecf3", "#1a2230"],
    vars: {
      "--paper": "#f5f7fa",
      "--paper-warm": "#e6ecf3",
      "--card": "#fdfdff",
      "--ink": "#1a2230",
      "--ink-soft": "#525c6e",
      "--ink-faint": "#8a94a5",
      "--line": "#dce3ec",
      "--accent": "#3a5a8c",
      "--accent-dark": "#2c4670",
      "--accent-soft": "#e2eaf5",
      "--thumb-a": "#e6ecf3",
      "--thumb-b": "#d2dce8",
      "--glow-a": "rgba(58, 90, 140, 0.10)",
      "--glow-b": "rgba(120, 160, 210, 0.12)",
    },
  },
  {
    id: "prune",
    name: "Prune",
    swatch: ["#8c3d63", "#f1e6ec", "#261c22"],
    vars: {
      "--paper": "#faf5f7",
      "--paper-warm": "#f1e6ec",
      "--card": "#fffcfd",
      "--ink": "#261c22",
      "--ink-soft": "#675660",
      "--ink-faint": "#9f8d98",
      "--line": "#ebdde4",
      "--accent": "#8c3d63",
      "--accent-dark": "#6f2f4e",
      "--accent-soft": "#f4e4ec",
      "--thumb-a": "#f1e6ec",
      "--thumb-b": "#e3d0da",
      "--glow-a": "rgba(140, 61, 99, 0.10)",
      "--glow-b": "rgba(200, 150, 180, 0.12)",
    },
  },
  {
    id: "sapin",
    name: "Sapin",
    swatch: ["#1f6b4a", "#e6ede7", "#16241d"],
    vars: {
      "--paper": "#f4f8f5",
      "--paper-warm": "#e6ede7",
      "--card": "#fdfffe",
      "--ink": "#16241d",
      "--ink-soft": "#4d6156",
      "--ink-faint": "#8aa094",
      "--line": "#d9e5dd",
      "--accent": "#1f6b4a",
      "--accent-dark": "#155338",
      "--accent-soft": "#dfeee6",
      "--thumb-a": "#e6ede7",
      "--thumb-b": "#cfe0d5",
      "--glow-a": "rgba(31, 107, 74, 0.10)",
      "--glow-b": "rgba(190, 60, 60, 0.10)",
    },
  },
  {
    id: "rose",
    name: "Rose",
    swatch: ["#c2415c", "#f7e4e8", "#2b1a1e"],
    vars: {
      "--paper": "#fdf5f6",
      "--paper-warm": "#f7e4e8",
      "--card": "#fffdfd",
      "--ink": "#2b1a1e",
      "--ink-soft": "#6f545a",
      "--ink-faint": "#a98d93",
      "--line": "#efdadf",
      "--accent": "#c2415c",
      "--accent-dark": "#9c2f48",
      "--accent-soft": "#fae3e8",
      "--thumb-a": "#f7e4e8",
      "--thumb-b": "#eccdd4",
      "--glow-a": "rgba(194, 65, 92, 0.11)",
      "--glow-b": "rgba(240, 170, 190, 0.14)",
    },
  },
  {
    id: "brume",
    name: "Brume",
    swatch: ["#6f8ba3", "#e8eef2", "#232b31"],
    vars: {
      "--paper": "#f7fafb",
      "--paper-warm": "#e8eef2",
      "--card": "#ffffff",
      "--ink": "#232b31",
      "--ink-soft": "#5b6a75",
      "--ink-faint": "#93a3ae",
      "--line": "#dee7ed",
      "--accent": "#6f8ba3",
      "--accent-dark": "#556f86",
      "--accent-soft": "#e6eef4",
      "--thumb-a": "#e8eef2",
      "--thumb-b": "#d5e0e8",
      "--glow-a": "rgba(111, 139, 163, 0.10)",
      "--glow-b": "rgba(230, 200, 170, 0.12)",
    },
  },
  {
    id: "ivoire",
    name: "Ivoire",
    swatch: ["#a58a4e", "#f2ece0", "#262218"],
    vars: {
      "--paper": "#fbf9f4",
      "--paper-warm": "#f2ece0",
      "--card": "#fffefb",
      "--ink": "#262218",
      "--ink-soft": "#6d6455",
      "--ink-faint": "#a49a86",
      "--line": "#eae3d4",
      "--accent": "#a58a4e",
      "--accent-dark": "#86702f",
      "--accent-soft": "#f4ecdb",
      "--thumb-a": "#f2ece0",
      "--thumb-b": "#e4d9c2",
      "--glow-a": "rgba(165, 138, 78, 0.11)",
      "--glow-b": "rgba(220, 200, 150, 0.14)",
    },
  },
  {
    /*
     * Un brun de bois, pour les cartes qui parlent d'animaux.
     *
     * Terracotta est un brun rouge, ivoire un doré : ni l'un ni l'autre ne donne
     * le marron franc d'un pelage. Celui-ci descend plus bas en clarté et
     * abandonne le rouge, tout en gardant le papier chaud du reste du site.
     */
    id: "noisette",
    name: "Noisette",
    swatch: ["#79512f", "#f1e7db", "#2a2119"],
    vars: {
      "--paper": "#faf6f1",
      "--paper-warm": "#f1e7db",
      "--card": "#fffdfa",
      "--ink": "#2a2119",
      "--ink-soft": "#6d6053",
      "--ink-faint": "#a39588",
      "--line": "#e6d9c9",
      "--accent": "#79512f",
      "--accent-dark": "#5d3d22",
      "--accent-soft": "#efe2d3",
      "--thumb-a": "#f1e7db",
      "--thumb-b": "#e2d2bb",
      "--glow-a": "rgba(121, 81, 47, 0.10)",
      "--glow-b": "rgba(198, 166, 118, 0.13)",
    },
  },
];

export const DEFAULT_PALETTE_ID: PaletteId = "terracotta";

export function paletteById(id: string | undefined | null): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** Lit l'identifiant stocké dans `theme.palette`, en tolérant l'absence et l'inconnu. */
export function paletteIdOf(palette: Record<string, string> | undefined): PaletteId {
  const id = palette?.id;
  return PALETTES.some((p) => p.id === id) ? (id as PaletteId) : DEFAULT_PALETTE_ID;
}

/** À étaler dans un `style={{...}}` : redéfinit les variables du thème localement. */
export function paletteStyle(palette: Record<string, string> | undefined): React.CSSProperties {
  return paletteById(paletteIdOf(palette)).vars as React.CSSProperties;
}
