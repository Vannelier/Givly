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
 * Le coussinet est un trace, pas une ellipse. Un coussinet reel s'evase vers le
 * bas et s'y termine en deux lobes separes par une petite echancrure ; l'ellipse
 * donnait une tache ovale qui ne ressemblait a rien de particulier. Les deux
 * dernieres courbes du trace se rejoignent au milieu du bord bas : c'est cette
 * rencontre qui creuse l'echancrure, et c'est elle qui fait lire « patte ».
 *
 * Les doigts sont gradues — les deux du milieu plus gros et plus hauts, les deux
 * exterieurs plus petits et plus bas — et chacun pointe vers l'exterieur. Quatre
 * ovales identiques poses en arc donnaient une rangee de perles.
 *
 * Dessinee autour de son propre zero pour que l'appelant n'ait qu'a la
 * translater, la tourner et la mettre a l'echelle, comme les autres signes.
 */
function patte(cle: string, x: number, y: number, s: number, r: number) {
  return (
    <g key={cle} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0-1.3c3.7 0 6.4 2.5 6.4 5.6 0 2.6-1.7 4.7-3.8 4.7-1.2 0-1.9-.6-2.6-.6s-1.4.6-2.6.6c-2.1 0-3.8-2.1-3.8-4.7C-6.4 1.2-3.7-1.3 0-1.3z" />
      <ellipse cx="-6" cy="-2.9" rx="1.5" ry="2" transform="rotate(-34 -6 -2.9)" />
      <ellipse cx="-2.3" cy="-6" rx="1.75" ry="2.35" transform="rotate(-13 -2.3 -6)" />
      <ellipse cx="2.3" cy="-6" rx="1.75" ry="2.35" transform="rotate(13 2.3 -6)" />
      <ellipse cx="6" cy="-2.9" rx="1.5" ry="2" transform="rotate(34 6 -2.9)" />
    </g>
  );
}

/*
 * Une empreinte de pied de bebe : la plante, le talon, cinq orteils.
 *
 * La plante est un trace en haricot, plus large du cote du gros orteil et
 * legerement creuse de l'autre : c'est la voute, qui ne touche pas le sol et ne
 * s'imprime donc pas. Deux ellipses concentriques donnaient un bonhomme de
 * neige, sans cote ni orientation.
 *
 * Le talon est distinct et decale vers l'exterieur — sur une vraie empreinte,
 * plante et talon sont deux marques separees.
 *
 * Les cinq orteils decroissent vite : le gros fait plus du double du petit, et
 * ils s'inclinent en s'ecartant. Cinq disques de tailles voisines donnaient une
 * chenille.
 *
 * `sens` vaut 1 pour un pied gauche et -1 pour un droit — un miroir horizontal,
 * qui remet le gros orteil du bon cote. C'est ce decalage entre les deux pieds
 * qui fait lire une marche plutot qu'une collection de taches.
 */
function pied(cle: string, x: number, y: number, s: number, r: number, sens: 1 | -1) {
  return (
    <g key={cle} transform={`translate(${x} ${y}) rotate(${r}) scale(${s * sens} ${s})`}>
      <path d="M-.6-5.7c3 0 5.3 2.2 5.3 5.1 0 3-1.9 5.5-4.5 5.5-2.7 0-4.8-2.3-5-5.3-.2-3 1.4-5.3 4.2-5.3z" />
      <ellipse cx="1.5" cy="10.4" rx="2.6" ry="3.1" transform="rotate(8 1.5 10.4)" />
      <ellipse cx="-3.2" cy="-8.4" rx="1.7" ry="2" transform="rotate(-18 -3.2 -8.4)" />
      <ellipse cx="-.2" cy="-9.4" rx="1.25" ry="1.5" transform="rotate(-6 -.2 -9.4)" />
      <ellipse cx="2.2" cy="-9" rx="1.1" ry="1.35" transform="rotate(6 2.2 -9)" />
      <ellipse cx="4.1" cy="-7.9" rx=".95" ry="1.15" transform="rotate(16 4.1 -7.9)" />
      <ellipse cx="5.5" cy="-6.3" rx=".8" ry=".95" transform="rotate(28 5.5 -6.3)" />
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
