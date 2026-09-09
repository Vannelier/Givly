"use client";

import { hslToHex, hexToHsl } from "@/lib/carteCouleur";
import { paletteById, paletteIdOf } from "@/lib/palettes";

/**
 * Le curseur qui règle la couleur de la carte imprimable.
 *
 * Un curseur de teinte, pas un sélecteur de palettes : la seule chose colorée
 * sur la carte est l'accent — le prénom, le filet du cadre, le décor semé
 * derrière — et une couleur qu'on cherche à l'œil se cherche mieux en glissant
 * qu'en essayant huit pastilles.
 *
 * Il part sur la couleur du thème de la page-cadeau, ce qui est presque toujours
 * la bonne : la carte et la page sont le même cadeau. Le bouton de retour ne
 * s'affiche que si on s'en est écarté — proposer d'annuler ce qu'on n'a pas fait
 * n'apprend rien et occupe une ligne.
 */
export default function PrintColorSlider({
  palette,
  teinte,
  defaut,
  onChange,
}: {
  palette: Record<string, string> | undefined;
  teinte: number;
  /** La teinte du thème : position de départ, et cible du bouton de retour. */
  defaut: number;
  onChange: (teinte: number) => void;
}) {
  /*
   * La pastille montre la couleur telle qu'elle sortira sur la carte, saturation
   * et clarte de la palette comprises — et non un `hsl(H 100% 50%)` fluo qui
   * promettrait une couleur que la carte n'a jamais.
   */
  const accent = paletteById(paletteIdOf(palette)).vars["--accent"];
  const base = hexToHsl(accent) ?? { h: 0, s: 0.4, l: 0.45 };
  const apercu = hslToHex({ ...base, h: teinte });
  const ecarte = Math.round(teinte) !== Math.round(defaut);

  /*
   * La course est centree sur la teinte du theme, et non calee sur 0-359.
   *
   * La teinte est un cercle : le zero n'y est un debut que par convention. Avec
   * une echelle absolue, une palette terracotta — accent a 13° — ouvrait avec le
   * curseur colle contre la butee gauche, ce qui se lit comme un reglage a zero
   * ou comme une commande desactivee, pas comme un point de depart. Ici le
   * defaut tombe au milieu, et on part vers le chaud ou vers le froid.
   *
   * La valeur reste ramenee dans le tour avant d'etre remontee : le reste du
   * code raisonne en degres de 0 a 359.
   */
  const centre = Math.round(defaut);
  const position = ((Math.round(teinte) - centre + 540) % 360) + centre - 180;
  const auTour = (h: number) => ((Math.round(h) % 360) + 360) % 360;

  /*
   * La piste montre exactement la course parcourue. Douze arrets suffisent a
   * lisser le degrade sans alourdir la regle.
   */
  const piste = `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) =>
    `hsl(${auTour(centre - 180 + i * 30)} 62% 48%)`,
  ).join(", ")})`;

  return (
    <div className="teinte">
      <div className="teinte__tete">
        <label className="teinte__label" htmlFor="teinte-carte">
          Couleur de la carte
        </label>
        {ecarte && (
          <button
            type="button"
            className="teinte__retour"
            onClick={() => onChange(defaut)}
          >
            Couleur du thème
          </button>
        )}
      </div>

      <div className="teinte__rangee">
        <input
          id="teinte-carte"
          className="teinte__curseur"
          type="range"
          min={centre - 180}
          max={centre + 180}
          step={1}
          value={position}
          onChange={(e) => onChange(auTour(Number(e.target.value)))}
          /*
           * Le curseur ne dit rien de lisible tout seul : « 214 » n'est pas une
           * couleur. On annonce donc la valeur en toutes lettres, et la pastille
           * a cote porte l'information pour ceux qui la voient.
           */
          aria-valuetext={
            ecarte ? `Teinte ${auTour(teinte)} degrés` : "Couleur du thème de la page-cadeau"
          }
          style={{ "--apercu": apercu, "--piste": piste } as React.CSSProperties}
        />
        <span
          className="teinte__pastille"
          style={{ background: apercu }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
