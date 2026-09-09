import type { MotifKind } from "@/lib/occasions";

/**
 * Décor d'occasion : un motif SVG répété, posé derrière le contenu.
 *
 * Dessiné en `currentColor` plutôt qu'en couleur fixe, pour suivre la palette
 * choisie sans code de couleur en dur. Purement décoratif, donc masqué aux
 * lecteurs d'écran.
 */
export default function GiftMotif({
  kind,
  /**
   * Resserre la tuile. Une vignette de 40 px de côté ne montre qu'un fragment
   * d'une tuile de 124 : à cette taille, « Confettis » se réduit à une tache et
   * ne se distingue plus de « Guirlande ». À 0,3 elle en montre trois de large,
   * assez pour reconnaître le décor.
   *
   * L'identifiant du motif suit l'échelle : deux `<pattern>` de même `id` dans
   * un document, le premier gagne, et la carte aurait hérité de la tuile serrée
   * de la vignette posée à côté d'elle.
   */
  echelle = 1,
}: {
  kind: MotifKind;
  echelle?: number;
}) {
  if (kind === "none") return null;

  const taille = Math.max(8, Math.round(patternSize(kind) * echelle));
  const id = echelle === 1 ? `motif-${kind}` : `motif-${kind}-${taille}`;

  return (
    <svg className="motif" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width={taille} height={taille} patternUnits="userSpaceOnUse">
          <g transform={echelle === 1 ? undefined : `scale(${echelle})`}>{shapes(kind)}</g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Une tuile large aere le decor : sur un grand ecran, un motif serre devient bruyant. */
function patternSize(kind: MotifKind): number {
  if (kind === "confetti") return 140;
  // Empreintes et pattes se lisent par paires, qui prennent plus de place qu'un
  // signe isole : une tuile de 124 les serrait au point de brouiller la marche.
  if (kind === "pattes" || kind === "pieds") return 150;
  return 124;
}

/*
 * Une patte : le coussinet, et quatre doigts en arc au-dessus.
 *
 * Dessinee autour de son propre zero pour que l'appelant n'ait qu'a la
 * translater, la tourner et la mettre a l'echelle, comme les autres signes.
 */
function patte(cle: string, x: number, y: number, s: number, r: number) {
  return (
    <g key={cle} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {/* Le coussinet, un peu plus large que haut. */}
      <ellipse cx="0" cy="3.4" rx="5.1" ry="4.3" />
      {/* Les quatre doigts, inclines vers l'exterieur. */}
      <ellipse cx="-4.7" cy="-3.2" rx="1.7" ry="2.1" transform="rotate(-24 -4.7 -3.2)" />
      <ellipse cx="-1.7" cy="-6.1" rx="1.7" ry="2.2" transform="rotate(-8 -1.7 -6.1)" />
      <ellipse cx="1.7" cy="-6.1" rx="1.7" ry="2.2" transform="rotate(8 1.7 -6.1)" />
      <ellipse cx="4.7" cy="-3.2" rx="1.7" ry="2.1" transform="rotate(24 4.7 -3.2)" />
    </g>
  );
}

/*
 * Une empreinte de pied de bebe : la plante, le talon, cinq orteils.
 *
 * `sens` vaut 1 pour un pied gauche et -1 pour un droit — un miroir horizontal,
 * qui remet le gros orteil du bon cote. C'est ce decalage entre les deux pieds
 * qui fait lire une marche plutot qu'une collection de taches.
 */
function pied(cle: string, x: number, y: number, s: number, r: number, sens: 1 | -1) {
  return (
    <g key={cle} transform={`translate(${x} ${y}) rotate(${r}) scale(${s * sens} ${s})`}>
      {/* La plante, puis le talon, plus petit et legerement decale. */}
      <ellipse cx="0" cy="0" rx="4.5" ry="5.3" />
      <ellipse cx="0.7" cy="8.1" rx="3" ry="3.5" />
      {/* Les cinq orteils, du gros au petit. */}
      <circle cx="-3.4" cy="-6.3" r="1.55" />
      <circle cx="-0.5" cy="-7.5" r="1.15" />
      <circle cx="1.9" cy="-7.1" r="1" />
      <circle cx="3.9" cy="-6" r="0.85" />
      <circle cx="5.5" cy="-4.4" r="0.7" />
    </g>
  );
}

function shapes(kind: MotifKind) {
  switch (kind) {
    case "confetti":
      return (
        <g fill="currentColor">
          <rect x="14" y="10" width="9" height="3.5" rx="1.75" transform="rotate(28 18 12)" />
          <rect x="72" y="26" width="8" height="3.5" rx="1.75" transform="rotate(-42 76 28)" />
          <rect x="38" y="58" width="10" height="3.5" rx="1.75" transform="rotate(66 43 60)" />
          <rect x="96" y="74" width="8" height="3.5" rx="1.75" transform="rotate(-18 100 76)" />
          <rect x="8" y="92" width="9" height="3.5" rx="1.75" transform="rotate(-58 12 94)" />
          <circle cx="60" cy="14" r="2.2" />
          <circle cx="102" cy="46" r="1.8" />
          <circle cx="24" cy="70" r="2" />
          <circle cx="78" cy="104" r="2.2" />
        </g>
      );

    case "flocons":
      return (
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
          {[
            [24, 22, 7],
            [70, 54, 5],
            [40, 78, 6],
          ].map(([cx, cy, r]) => (
            <g key={`${cx}-${cy}`}>
              <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
              <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
              <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} />
              <line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} />
            </g>
          ))}
          <circle cx="86" cy="16" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="60" r="1.4" fill="currentColor" stroke="none" />
        </g>
      );

    case "coeurs":
      return (
        <g fill="currentColor">
          {[
            [22, 26, 1],
            [66, 58, 0.75],
            [40, 82, 0.9],
          ].map(([x, y, s]) => (
            <path
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) scale(${s})`}
              d="M0 4c-3-3.4-8-1.6-8 2.4C-8 10.6-3 14 0 16c3-2 8-5.4 8-9.6C8 2.4 3 0.6 0 4z"
            />
          ))}
          <circle cx="84" cy="20" r="1.6" />
          <circle cx="10" cy="62" r="1.4" />
        </g>
      );

    case "etoiles":
      return (
        <g fill="currentColor">
          {[
            [26, 24, 1],
            [72, 50, 0.7],
            [44, 80, 0.85],
            [88, 88, 0.55],
          ].map(([x, y, s]) => (
            <path
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) scale(${s})`}
              d="M0 -8C1.2 -2.6 2.6 -1.2 8 0 2.6 1.2 1.2 2.6 0 8c-1.2-5.4-2.6-6.8-8-8 5.4-1.2 6.8-2.6 8-8z"
            />
          ))}
        </g>
      );

    case "feuilles":
      return (
        <g fill="currentColor">
          {[
            [26, 28, 1, -25],
            [78, 60, 0.8, 40],
            [48, 96, 0.9, -55],
          ].map(([x, y, s, r]) => (
            <path
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
              d="M0 0c2.6-6 8.2-9.4 14-9.4-0.4 6-4.4 11.2-10 12.8C1.8 4.2 0 2.2 0 0z"
            />
          ))}
          <circle cx="96" cy="22" r="1.6" />
          <circle cx="14" cy="70" r="1.4" />
        </g>
      );

    case "guirlande":
      return (
        <g stroke="currentColor" strokeWidth="1.4" fill="none">
          <path d="M0 20 Q24 42 48 20 T96 20" />
          <path d="M0 68 Q24 90 48 68 T96 68" />
          <g fill="currentColor" stroke="none">
            <circle cx="24" cy="33" r="2.4" />
            <circle cx="72" cy="33" r="2.4" />
            <circle cx="24" cy="81" r="2.4" />
            <circle cx="72" cy="81" r="2.4" />
          </g>
        </g>
      );

    /*
     * Pattes : trois empreintes en diagonale, orientees comme si l'animal
     * traversait la tuile. Les rotations alternent legerement — une patte gauche
     * ne se pose pas au meme angle qu'une droite.
     */
    case "pattes":
      return (
        <g fill="currentColor">
          {(
            [
              ["a", 28, 30, 1, -14],
              ["b", 76, 66, 0.82, 16],
              ["c", 46, 110, 0.9, -8],
              ["d", 116, 20, 0.62, 24],
            ] as const
          ).map(([cle, x, y, s, r]) => patte(cle, x, y, s, r))}
          <circle cx="108" cy="112" r="1.8" />
          <circle cx="12" cy="76" r="1.5" />
        </g>
      );

    /*
     * Pieds : deux paires de pas, gauche puis droit, decalees l'une par rapport
     * a l'autre. C'est le decalage qui raconte la marche.
     */
    case "pieds":
      return (
        <g fill="currentColor">
          {(
            [
              ["g1", 24, 26, 0.95, -12, 1],
              ["d1", 44, 40, 0.95, -12, -1],
              ["g2", 86, 88, 0.8, 14, 1],
              ["d2", 106, 74, 0.8, 14, -1],
            ] as const
          ).map(([cle, x, y, s, r, sens]) => pied(cle, x, y, s, r, sens))}
          <circle cx="118" cy="24" r="1.6" />
          <circle cx="16" cy="112" r="1.4" />
        </g>
      );

    default:
      return null;
  }
}
