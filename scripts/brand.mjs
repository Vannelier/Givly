/**
 * Fabrique la marque MyPresentsForYou : le SVG, les PNG et le favicon.ico.
 *
 * Une seule description géométrique, plus bas, sert de source à tout le reste —
 * le SVG est écrit à partir d'elle, et le rasteriseur redessine exactement les
 * mêmes formes. Deux fichiers dessinés à la main auraient dérivé l'un de l'autre
 * au premier ajustement.
 *
 * Sans dépendance : les images sont assez simples (rectangle arrondi, bandes,
 * ellipses) pour être calculées directement, et ajouter une bibliothèque de
 * rendu pour six fichiers régénérés une fois par an serait payer cher un confort
 * ponctuel. Le suréchantillonnage 4×4 suffit largement à lisser les bords.
 *
 *   npm run brand
 *
 * Les fichiers produits sont versionnés : le build ne les régénère pas.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- La marque --------------------------------------------------------------

/*
 * Un paquet cadeau vu de face : le couvercle, le corps, le nœud posé dessus, et
 * le ruban ménagé en creux dans la silhouette.
 *
 * Tout est dimensionné pour tenir à 16 px — la taille réelle d'un favicon dans
 * un onglet, où rien de plus fin que deux pixels ne survit. D'où des boucles
 * pleines plutôt qu'évidées, et un ruban assez large pour rester lisible une
 * fois réduit. Une première version en plein cadre, deux bandes qui se croisent,
 * a été abandonnée : réduite, elle ne se lisait plus comme un paquet mais comme
 * une croix.
 */
const VB = 64;
const RADIUS = 14;

const INK_TOP = [0xb8, 0x59, 0x3f];
const INK_BOTTOM = [0x8b, 0x3f, 0x2f];
const RIBBON = [0xfa, 0xf6, 0xf0];

// Le couvercle déborde du corps de chaque côté : c'est ce décalage qui fait lire
// un paquet plutôt qu'un simple rectangle.
const LID = { x: 6.5, y: 21, w: 51, h: 10.5, r: 3 };
const BOX = { x: 10.5, y: 29.5, w: 43, h: 25, r: 4.5 };
const LOOP = { dx: 8.8, cy: 15.6, rx: 9.2, ry: 6.3, tilt: 28 };
const KNOT = { cx: 32, cy: 20.5, r: 3.9 };
// Le ruban n'est pas dessiné par-dessus : il est creusé dans la silhouette, et
// laisse donc voir le fond. Une bande claire sur clair n'aurait rien montré.
const STRAP = { x: 29.3, w: 5.4, y: LID.y, h: BOX.y + BOX.h - LID.y };

const hex = ([r, g, b]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

function markSvg({ radius = RADIUS } = {}) {
  const loop = (side) => {
    const cx = (32 + side * LOOP.dx).toFixed(1);
    return (
      `<ellipse cx="${cx}" cy="${LOOP.cy}" rx="${LOOP.rx}" ry="${LOOP.ry}"` +
      ` transform="rotate(${side * LOOP.tilt} ${cx} ${LOOP.cy})"/>`
    );
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${VB}" height="${VB}" role="img" aria-label="MyPresentsForYou">
  <defs>
    <linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hex(INK_TOP)}"/>
      <stop offset="1" stop-color="${hex(INK_BOTTOM)}"/>
    </linearGradient>
    <mask id="paquet">
      <rect width="${VB}" height="${VB}" fill="#000"/>
      <g fill="#fff">
        <rect x="${LID.x}" y="${LID.y}" width="${LID.w}" height="${LID.h}" rx="${LID.r}"/>
        <rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="${BOX.r}"/>
      </g>
      <rect x="${STRAP.x}" y="${STRAP.y}" width="${STRAP.w}" height="${STRAP.h}" fill="#000"/>
      <g fill="#fff">
        ${loop(-1)}
        ${loop(1)}
        <circle cx="${KNOT.cx}" cy="${KNOT.cy}" r="${KNOT.r}"/>
      </g>
    </mask>
  </defs>
  <rect width="${VB}" height="${VB}" rx="${radius}" fill="url(#fond)"/>
  <rect width="${VB}" height="${VB}" rx="${radius}" fill="${hex(RIBBON)}" mask="url(#paquet)"/>
</svg>
`;
}

// --- Tests d'appartenance, en unités du viewBox ------------------------------

/** Distance signée à un rectangle arrondi occupant tout le viewBox. */
function inRoundedSquare(x, y, radius) {
  const half = VB / 2;
  const dx = Math.abs(x - half) - (half - radius);
  const dy = Math.abs(y - half) - (half - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) <= radius;
}

function inTiltedEllipse(x, y, cx, cy, rx, ry, degrees) {
  const t = (-degrees * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const u = dx * Math.cos(t) - dy * Math.sin(t);
  const v = dx * Math.sin(t) + dy * Math.cos(t);
  return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
}

function inRoundedRect(x, y, { x: rx0, y: ry0, w, h, r }) {
  const cx = rx0 + w / 2;
  const cy = ry0 + h / 2;
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) <= r;
}

/**
 * La silhouette du paquet, ruban déjà creusé.
 *
 * Le nœud est testé en premier et échappe au creux : il est posé par-dessus le
 * ruban, comme sur un vrai paquet. Le laisser entamer par la bande le coupait en
 * deux et faisait apparaître deux échardes de part et d'autre.
 */
function inRibbon(x, y) {
  if (inTiltedEllipse(x, y, 32 - LOOP.dx, LOOP.cy, LOOP.rx, LOOP.ry, -LOOP.tilt)) return true;
  if (inTiltedEllipse(x, y, 32 + LOOP.dx, LOOP.cy, LOOP.rx, LOOP.ry, LOOP.tilt)) return true;
  if (Math.hypot(x - KNOT.cx, y - KNOT.cy) <= KNOT.r) return true;

  if (x >= STRAP.x && x <= STRAP.x + STRAP.w && y >= STRAP.y && y <= STRAP.y + STRAP.h) {
    return false;
  }
  return inRoundedRect(x, y, LID) || inRoundedRect(x, y, BOX);
}

/**
 * Rend la marque en RGBA non prémultiplié.
 *
 * Chaque pixel est échantillonné 4×4 fois et les couleurs sont moyennées : les
 * bords et le dégradé sortent lisses sans avoir à gérer de composition alpha.
 */
function render(size, { radius = RADIUS, inset = 0 } = {}) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 4;
  const span = VB - 2 * inset;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Coordonnées du sous-échantillon dans le viewBox.
          const x = inset + ((px + (sx + 0.5) / SS) / size) * span;
          const y = inset + ((py + (sy + 0.5) / SS) / size) * span;
          if (!inRoundedSquare(x, y, radius)) continue;

          a += 255;
          if (inRibbon(x, y)) {
            r += RIBBON[0];
            g += RIBBON[1];
            b += RIBBON[2];
          } else {
            const k = y / VB;
            r += INK_TOP[0] + (INK_BOTTOM[0] - INK_TOP[0]) * k;
            g += INK_TOP[1] + (INK_BOTTOM[1] - INK_TOP[1]) * k;
            b += INK_TOP[2] + (INK_BOTTOM[2] - INK_TOP[2]) * k;
          }
        }
      }

      const total = SS * SS;
      const covered = a / 255;
      const i = (py * size + px) * 4;
      // Couleur moyenne des seuls sous-échantillons opaques : sans ça, les bords
      // tireraient vers le noir des sous-échantillons vides.
      out[i] = covered ? Math.round(r / covered) : 0;
      out[i + 1] = covered ? Math.round(g / covered) : 0;
      out[i + 2] = covered ? Math.round(b / covered) : 0;
      out[i + 3] = Math.round(a / total);
    }
  }
  return out;
}

// --- Encodage PNG -----------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  // Filtre 0 (aucun) en tête de chaque ligne : les images sont petites et
  // l'aplat compresse déjà très bien, un filtrage adaptatif ne rapporterait rien.
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Encodage ICO -----------------------------------------------------------

/**
 * Les images sont stockées en DIB (bitmap brut) et non en PNG.
 *
 * L'ICO accepte les deux depuis Vista, mais le .ico n'existe justement que pour
 * les vieux clients — les robots d'indexation et les navigateurs anciens qui
 * ignorent `<link rel="icon">` et vont chercher /favicon.ico directement. Leur
 * servir un format qu'ils pourraient ne pas décoder viderait le fichier de son
 * intérêt. Le surcoût est de quelques kilo-octets.
 */
function dibEntry(size, rgba) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // hauteur XOR + masque AND
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);

  // BGRA, lignes de bas en haut.
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = ((size - 1 - y) * size + x) * 4;
      xor[dst] = rgba[src + 2];
      xor[dst + 1] = rgba[src + 1];
      xor[dst + 2] = rgba[src];
      xor[dst + 3] = rgba[src + 3];
    }
  }

  // Masque AND laissé à zéro : la transparence est portée par le canal alpha.
  const maskStride = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskStride * size);

  return Buffer.concat([header, xor, mask]);
}

function encodeIco(images) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2); // 1 = icône
  dir.writeUInt16LE(images.length, 4);

  const entries = [];
  const blobs = [];
  let offset = 6 + images.length * 16;

  for (const { size, rgba } of images) {
    const blob = dibEntry(size, rgba);
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(blob.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    blobs.push(blob);
    offset += blob.length;
  }

  return Buffer.concat([dir, ...entries, ...blobs]);
}

// --- Écriture ---------------------------------------------------------------

function write(relative, data) {
  const target = resolve(ROOT, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  console.log(`  ${relative.padEnd(34)} ${(data.length / 1024).toFixed(1)} Ko`);
}

console.log("Marque MyPresentsForYou :");

write("app/icon.svg", markSvg());

// Le .ico embarque les trois tailles que réclament les navigateurs et les robots.
write(
  "app/favicon.ico",
  encodeIco([16, 32, 48].map((size) => ({ size, rgba: render(size) }))),
);

// iOS arrondit lui-même l'icône et ne gère pas la transparence : carré plein.
write("app/apple-icon.png", encodePng(180, render(180, { radius: 0 })));

for (const size of [192, 512]) {
  write(`public/icon-${size}.png`, encodePng(size, render(size)));
}

// Icône « maskable » : Android rogne jusqu'à 20 % sur chaque bord, il faut donc
// que la marque tienne dans le cercle de sûreté central.
write("public/icon-maskable-512.png", encodePng(512, render(512, { radius: 0, inset: -13 })));

console.log("Terminé.");
