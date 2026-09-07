import type { EffectId } from "@/lib/occasions";

/**
 * L'effet joué sur la page une fois découverte : confettis, pétales, étincelles
 * ou neige.
 *
 * Séparé de l'ouverture à dessein. L'ouverture dit comment le voile se lève ;
 * l'effet, ce qui se passe derrière. Les deux se combinent librement, et un
 * effet reste utile quand le donneur a coupé le voile.
 *
 * Tout est en CSS : aucune boucle JavaScript, aucun canvas. Les particules sont
 * des `<span>` vides que le compositeur peut déplacer sans repeindre.
 *
 * **Les positions sont tirées d'une suite déterministe, jamais de `Math.random`.**
 * Un tirage au rendu donnerait des valeurs différentes côté serveur et côté
 * navigateur, et l'hydratation divergerait à chaque chargement.
 */

const COUNT = 26;

/** Suite pseudo-aléatoire à partir d'un entier. Stable d'un rendu à l'autre. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function GiftEffect({ kind }: { kind: EffectId }) {
  if (kind === "aucun") return null;

  return (
    <div className={`fx fx--${kind}`} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const a = noise(i + 1);
        const b = noise(i + 101);
        const c = noise(i + 211);
        return (
          <span
            key={i}
            style={
              {
                "--x": `${(a * 100).toFixed(2)}%`,
                "--delay": `${(b * 1.4).toFixed(2)}s`,
                "--dur": `${(2.6 + c * 2.4).toFixed(2)}s`,
                "--drift": `${(b * 60 - 30).toFixed(1)}px`,
                "--spin": `${(a * 720 - 360).toFixed(0)}deg`,
                "--size": `${(0.4 + c * 0.5).toFixed(2)}rem`,
                "--hue": `${Math.round(a * 360)}`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
