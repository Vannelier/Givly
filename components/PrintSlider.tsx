"use client";

/**
 * Un curseur simple, avec son intitulé et sa valeur lisible.
 *
 * Le curseur de couleur a sa propre pièce — il porte un dégradé de teintes et
 * une pastille, rien de tout cela n'est réutilisable. Celui-ci sert aux réglages
 * qui n'ont qu'un nombre à montrer : la taille du décor, son contraste.
 *
 * La valeur est affichée en toutes lettres à côté de l'intitulé. Un curseur nu
 * ne dit ni où il en est ni ce qu'il fait tant qu'on ne l'a pas bougé, et sur la
 * carte le décor est assez discret pour qu'un petit déplacement passe inaperçu.
 */
export default function PrintSlider({
  id,
  label,
  valeur,
  min,
  max,
  pas,
  defaut,
  format,
  onChange,
}: {
  id: string;
  label: string;
  valeur: number;
  min: number;
  max: number;
  pas: number;
  /** Valeur d'origine : cible du bouton de retour, qui ne s'affiche qu'à l'écart. */
  defaut: number;
  /** Rend la valeur lisible — « 120 % », « ×1,4 ». */
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const ecarte = Math.abs(valeur - defaut) > pas / 2;

  return (
    <div className="reglage">
      <div className="reglage__tete">
        <label className="reglage__label" htmlFor={id}>
          {label}
        </label>
        {/*
          La valeur reste affichee quand on s'ecarte du defaut : c'est justement
          la qu'on la lit. Le retour vient a cote, pas a sa place.
        */}
        <span className="reglage__droite">
          {ecarte && (
            <button type="button" className="reglage__retour" onClick={() => onChange(defaut)}>
              Réinitialiser
            </button>
          )}
          <span className="reglage__valeur">{format(valeur)}</span>
        </span>
      </div>

      <input
        id={id}
        className="reglage__curseur"
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        aria-valuetext={format(valeur)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
