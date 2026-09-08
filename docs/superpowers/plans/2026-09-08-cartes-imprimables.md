# Cartes imprimables au carrousel — plan d'implémentation

> **Pour les agents :** ce plan s'exécute tâche par tâche. Les étapes utilisent
> des cases à cocher (`- [ ]`) pour le suivi.

**But :** remplacer la carte A6 unique de `/admin/[token]/imprimer` par une
feuille A4 paysage pliable en deux, déclinée en dix modèles parcourus au
carrousel.

**Architecture :** une coquille unique (`PrintableCard`) tient la feuille, les
deux panneaux, le repère de pli et le QR ; ce qui distingue un modèle vit dans
une classe CSS `feuille--<composition>` et un décor SVG existant. Les modèles
sont des données pures dans `lib/printModels.ts`, indexées par identifiant —
même schéma que les palettes, occasions et polices du projet.

**Pile :** Next.js 15 App Router, React 19, CSS natif, `qrcode`. Vérifications
via `scripts/check.ts` (harnais maison, synchrone, sans DOM).

**Spec :** `docs/superpowers/specs/2026-09-08-cartes-imprimables-design.md`

---

## Structure des fichiers

| chemin | rôle | action |
|---|---|---|
| `lib/printModels.ts` | la liste des modèles et son accesseur | créer |
| `app/print.css` | mécanique d'impression + un bloc par composition | créer |
| `components/PrintCarousel.tsx` | flèches, nom, compteur, clavier | créer |
| `components/PrintableCard.tsx` | la coquille : feuille, panneaux, pli, QR | réécrire |
| `app/editor.css` | perd le bloc « Carte a imprimer » (l. 1252-1400) | modifier |
| `app/layout.tsx` | importe `./print.css` | modifier |
| `scripts/check.ts` | vérifications des modèles | modifier |

---

## Tâche 1 : la liste des modèles

**Fichiers :**
- Créer : `lib/printModels.ts`
- Modifier : `scripts/check.ts`

- [ ] **Étape 1 : écrire les vérifications qui échouent**

Dans `scripts/check.ts`, ajouter l'import puis le bloc, juste avant
`// --- Reduction des images` :

```ts
import {
  DEFAULT_PRINT_MODEL_ID,
  PRINT_COMPOSITIONS,
  PRINT_MODELS,
  printModelById,
} from "../lib/printModels";
```

```ts
// --- Modeles de carte imprimable -------------------------------------------

test("les identifiants de modele sont uniques", () => {
  const ids = PRINT_MODELS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("chaque modele porte un nom et un decor connus", () => {
  const decors = ["none", "confetti", "flocons", "coeurs", "etoiles", "guirlande", "feuilles"];
  for (const m of PRINT_MODELS) {
    assert.ok(m.nom.trim().length > 0, m.id);
    assert.ok(decors.includes(m.motif), `${m.id} : decor ${m.motif}`);
    assert.ok(PRINT_COMPOSITIONS.includes(m.composition), `${m.id} : ${m.composition}`);
  }
});

test("les quatre compositions sont toutes representees", () => {
  for (const c of PRINT_COMPOSITIONS) {
    assert.ok(PRINT_MODELS.some((m) => m.composition === c), c);
  }
});

test("printModelById retombe sur le defaut", () => {
  assert.equal(printModelById("inconnu").id, DEFAULT_PRINT_MODEL_ID);
  assert.equal(printModelById("").id, DEFAULT_PRINT_MODEL_ID);
  assert.equal(printModelById(undefined).id, DEFAULT_PRINT_MODEL_ID);
  assert.equal(printModelById(PRINT_MODELS[2].id).id, PRINT_MODELS[2].id);
});
```

- [ ] **Étape 2 : lancer pour vérifier l'échec**

Commande : `npm run typecheck`
Attendu : échec, `Cannot find module '../lib/printModels'`.

- [ ] **Étape 3 : écrire le module**

Créer `lib/printModels.ts` :

```ts
import type { MotifKind } from "./occasions";

/**
 * Les modèles de carte imprimable.
 *
 * Une liste plate, pas deux sélecteurs à croiser : chaque entrée est une
 * combinaison déjà arbitrée d'une composition et d'un décor. Un carrousel qu'on
 * parcourt à la flèche doit être court, et dix combinaisons choisies valent
 * mieux que vingt-huit engendrées.
 *
 * Comme les palettes et les occasions, seul l'identifiant compte : la palette et
 * la police restent celles du thème de la carte, et tout le rendu vit dans
 * `app/print.css`. Ajouter un modèle coûte une ligne ici et un bloc de style.
 *
 * Aucun import Node : ce module part dans le bundle navigateur.
 */

/** Ce qui change dans la mise en page. Le rendu vit dans `app/print.css`. */
export const PRINT_COMPOSITIONS = ["centre", "cadre", "bandeau", "affiche"] as const;

export type PrintComposition = (typeof PRINT_COMPOSITIONS)[number];

export type PrintModel = {
  id: string;
  nom: string;
  composition: PrintComposition;
  motif: MotifKind;
};

export const PRINT_MODELS: PrintModel[] = [
  { id: "classique", nom: "Classique", composition: "centre", motif: "none" },
  { id: "classique-coeurs", nom: "Cœurs", composition: "centre", motif: "coeurs" },
  { id: "cadre-flocons", nom: "Flocons", composition: "cadre", motif: "flocons" },
  { id: "cadre-etoiles", nom: "Étoiles", composition: "cadre", motif: "etoiles" },
  { id: "cadre-feuilles", nom: "Feuilles", composition: "cadre", motif: "feuilles" },
  { id: "bandeau", nom: "Bandeau", composition: "bandeau", motif: "none" },
  { id: "bandeau-confetti", nom: "Confettis", composition: "bandeau", motif: "confetti" },
  { id: "bandeau-guirlande", nom: "Guirlande", composition: "bandeau", motif: "guirlande" },
  { id: "affiche", nom: "Affiche", composition: "affiche", motif: "none" },
  { id: "affiche-coeurs", nom: "Affiche fleurie", composition: "affiche", motif: "coeurs" },
];

export const DEFAULT_PRINT_MODEL_ID = PRINT_MODELS[0].id;

/** Un identifiant inconnu retombe sur le défaut, jamais sur `undefined`. */
export function printModelById(id: string | undefined | null): PrintModel {
  return PRINT_MODELS.find((m) => m.id === id) ?? PRINT_MODELS[0];
}
```

- [ ] **Étape 4 : vérifier que ça passe**

Commandes : `npm run typecheck` puis `npm run check`
Attendu : typecheck silencieux, et le compte de vérifications augmente de 4.

- [ ] **Étape 5 : committer**

```bash
git add lib/printModels.ts scripts/check.ts
git commit -m "Ajoute la liste des modeles de carte imprimable"
```

---

## Tâche 2 : la feuille A4 et ses deux panneaux

**Fichiers :**
- Créer : `app/print.css`
- Modifier : `app/layout.tsx`, `app/editor.css`

- [ ] **Étape 1 : créer `app/print.css`**

Contenu complet (mécanique commune ; les compositions arrivent tâche 4) :

```css
/* ---------------------------------------------------------------------------
   La carte a imprimer : une feuille A4 paysage, pliee en deux -> carte A5.

   Le pliage de la carte de voeux classique : aucun reglage d'imprimante, aucun
   decoupage, et l'interieur reste vierge pour un mot ecrit a la main. La version
   precedente forcait `@page { size: A6 }` tout en invitant a plier — il n'y
   avait rien a plier, et une imprimante chargee en A4 calait la carte dans un
   coin.
   --------------------------------------------------------------------------- */

.print-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  gap: 1.25rem;
  padding: clamp(1rem, 4vw, 2.5rem);
  align-content: center;
}

.print-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 40rem;
  text-align: center;
}

.print-bar p {
  flex: 1 1 16rem;
  font-size: 0.84rem;
  color: var(--ink-soft);
}

/*
 * A l'ecran la feuille est reduite pour tenir dans la fenetre, mais elle garde
 * ses dimensions reelles en millimetres : c'est la meme boite qui part a
 * l'impression, donc l'apercu ne peut pas mentir sur les proportions.
 * `--zoom` est pose par le composant, qui mesure le cadre.
 */
.feuille-cadre {
  width: 100%;
  max-width: 297mm;
  aspect-ratio: 297 / 210;
  position: relative;
}

.feuille {
  position: absolute;
  top: 0;
  left: 0;
  width: 297mm;
  height: 210mm;
  transform: scale(var(--zoom, 1));
  transform-origin: top left;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 18px 44px -20px rgba(52, 38, 28, 0.4);
}

/* Les deux moities. La droite se retrouve devant une fois la carte pliee. */
.feuille__panneau {
  position: relative;
  z-index: 1;
  padding: 16mm 13mm;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 3mm;
  text-align: center;
}

/*
 * Le decor est pose en `position: absolute` dans le panneau ; le texte, lui,
 * n'est pas positionne et se peindrait donc dessous. On remonte tout ce qui
 * n'est pas le decor.
 */
.feuille__panneau > *:not(.motif) {
  position: relative;
  z-index: 1;
}

/*
 * Deux traits courts sur les bords, pas une ligne en pointilles d'un bord a
 * l'autre : celle-ci resterait visible sur la carte finie.
 */
.feuille__pli {
  position: absolute;
  left: 50%;
  width: 0.25mm;
  height: 7mm;
  margin-left: -0.125mm;
  background: var(--line);
  z-index: 2;
}

.feuille__pli--haut {
  top: 0;
}

.feuille__pli--bas {
  bottom: 0;
}

/* --- Contenu commun aux quatre compositions -------------------------------- */

.feuille__to {
  font-family: var(--font-title, var(--font-display, Georgia, serif));
  font-size: 15pt;
  color: var(--accent-dark);
}

.feuille__intro {
  font-size: 8pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.feuille__titre {
  font-family: var(--font-title, var(--font-display, Georgia, serif));
  font-size: 22pt;
  line-height: 1.15;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

/*
 * Le QR est toujours pose sur une plage blanche : la norme demande quatre
 * modules de zone de silence, et le code ne peut pas etre pose directement sur
 * un aplat de couleur ou un decor.
 */
.feuille__qr {
  width: 46mm;
  height: 46mm;
  padding: 3mm;
  background: #fff;
  border-radius: 5px;
  border: 1px solid var(--line);
}

.feuille__qr svg,
.feuille__qr > div {
  width: 100%;
  height: 100%;
  display: block;
}

.feuille__qr-vide {
  width: 100%;
  height: 100%;
  background: var(--paper-warm);
  border-radius: 3px;
}

.feuille__cta {
  font-size: 8pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.feuille__signature {
  font-family: var(--font-title, var(--font-display, Georgia, serif));
  font-size: 11pt;
  color: var(--ink-soft);
}

/* --- Impression ------------------------------------------------------------ */

/*
 * Il ne reste que la feuille : ni commandes, ni ombre, ni reduction. Le
 * `print-color-adjust` force le navigateur a imprimer les aplats, qu'il
 * supprime par defaut pour economiser l'encre.
 */
@media print {
  @page {
    size: A4 landscape;
    margin: 0;
  }

  body {
    background: #fff;
  }

  .print-bar {
    display: none;
  }

  .print-page {
    min-height: 0;
    padding: 0;
    display: block;
  }

  .feuille-cadre {
    max-width: none;
    width: 297mm;
    height: 210mm;
    aspect-ratio: auto;
  }

  .feuille {
    position: static;
    transform: none;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Étape 2 : brancher la feuille de style**

Dans `app/layout.tsx`, après `import "./legal.css";` :

```ts
import "./print.css";
```

- [ ] **Étape 3 : retirer l'ancien bloc de `app/editor.css`**

Supprimer de `/* --- Carte a imprimer ---` jusqu'à la fin du `@media print`
inclus (environ lignes 1252 à 1400). Vérifier qu'il ne reste plus rien :

Commande : `grep -c "card-print\|print-page\|print-bar" app/editor.css`
Attendu : `0`

- [ ] **Étape 4 : committer**

```bash
git add app/print.css app/layout.tsx app/editor.css
git commit -m "Sort la feuille de style d'impression et passe au format A4 plie"
```

---

## Tâche 3 : la coquille à deux panneaux

**Fichiers :**
- Modifier : `components/PrintableCard.tsx`

- [ ] **Étape 1 : réécrire le composant**

Remplacer intégralement le contenu de `components/PrintableCard.tsx` :

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import GiftMotif from "@/components/GiftMotif";
import PrintCarousel from "@/components/PrintCarousel";
import { fontById } from "@/lib/occasions";
import { paletteStyle } from "@/lib/palettes";
import { DEFAULT_PRINT_MODEL_ID, printModelById } from "@/lib/printModels";
import type { Theme } from "@/lib/types";

/**
 * Une feuille A4 paysage, pliée en deux : carte A5 portrait.
 *
 * Le panneau droit porte la couverture, le gauche le dos. On rabat le gauche
 * derrière le droit : le pli tombe à gauche, la couverture est devant, et
 * l'intérieur — non imprimé — s'ouvre comme un livre pour un mot écrit à la
 * main.
 *
 * Tout est dessiné en CSS et en SVG : rien à télécharger, et l'impression sort
 * nette à n'importe quelle taille. Les commandes disparaissent à l'impression.
 */
export default function PrintableCard({
  url,
  to,
  intro,
  title,
  signature,
  theme,
  backHref,
}: {
  url: string;
  to: string;
  intro: string;
  title: string;
  signature: string;
  theme: Theme;
  backHref: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_PRINT_MODEL_ID);
  const modele = printModelById(modelId);

  useEffect(() => {
    QRCode.toString(url, {
      type: "svg",
      // La marge vient du CSS : la plage blanche autour du code fait office de
      // zone de silence, et la doubler ici retrecirait le code pour rien.
      margin: 0,
      // Q tolere 25 % de degradation contre 15 % pour M. Sur papier, le code
      // sera plie, manipule, parfois imprime a court d'encre.
      errorCorrectionLevel: "Q",
      color: { dark: "#1b1b1b", light: "#ffffff" },
    })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);

  /*
   * La feuille garde ses dimensions reelles en millimetres — c'est la meme boite
   * qui part a l'impression. A l'ecran, on la reduit pour qu'elle tienne dans la
   * fenetre : le facteur se mesure, il ne se devine pas.
   */
  const cadre = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const mesurer = () => {
      const feuille = el.querySelector<HTMLElement>(".feuille");
      if (!feuille) return;
      // `offsetWidth` ignore le transform deja applique : c'est la largeur reelle.
      setZoom(el.clientWidth / feuille.offsetWidth);
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  const skin = {
    ...paletteStyle(theme.palette),
    "--font-title": fontById(theme.font).cssVar,
    "--zoom": zoom,
  } as React.CSSProperties;

  return (
    <div className="print-page">
      <div className="print-bar">
        <Link className="btn btn--ghost btn--sm" href={backHref}>
          ← Retour
        </Link>
        <p>
          Feuille A4, pliée en deux. Rabats la moitié gauche derrière la droite :
          la couverture se retrouve devant, le QR code au dos.
        </p>
        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
          Imprimer
        </button>
      </div>

      <PrintCarousel modelId={modelId} onChange={setModelId} />

      <div className="feuille-cadre" ref={cadre}>
        <div className={`feuille feuille--${modele.composition}`} style={skin}>
          <span className="feuille__pli feuille__pli--haut" aria-hidden="true" />
          <span className="feuille__pli feuille__pli--bas" aria-hidden="true" />

          {/* Panneau gauche : le dos, visible en retournant la carte. */}
          <div className="feuille__panneau feuille__dos">
            <GiftMotif kind={modele.motif} />
            <div className="feuille__qr">
              {svg ? (
                // SVG produit a l'instant par la bibliotheque, a partir de notre
                // propre URL : rien d'exterieur n'entre dans cette chaine.
                <div dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="feuille__qr-vide" />
              )}
            </div>
            <p className="feuille__cta">Scanne pour ouvrir ta carte</p>
            {signature && <p className="feuille__signature">{signature}</p>}
          </div>

          {/* Panneau droit : la couverture, devant une fois pliee. */}
          <div className="feuille__panneau feuille__couv">
            <GiftMotif kind={modele.motif} />
            {to && <p className="feuille__to">Pour {to}</p>}
            {intro && <p className="feuille__intro">{intro}</p>}
            <h1 className="feuille__titre">{title}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : committer après la tâche 4** (le composant importe
      `PrintCarousel`, qui n'existe pas encore — le typecheck échouera d'ici là).

---

## Tâche 4 : le carrousel

**Fichiers :**
- Créer : `components/PrintCarousel.tsx`

- [ ] **Étape 1 : écrire le composant**

```tsx
"use client";

import { useEffect } from "react";
import { PRINT_MODELS, printModelById } from "@/lib/printModels";

/**
 * Les flèches qui font défiler les modèles de carte.
 *
 * Séparé de la carte : ça ne dessine rien de ce qui s'imprime, et ça disparaît
 * au moment de l'impression. Le choix n'est pas enregistré — il vit dans l'état
 * de la page. Le persister demanderait une colonne, une migration et une règle
 * de validation, pour un geste qu'on fait une fois.
 */
export default function PrintCarousel({
  modelId,
  onChange,
}: {
  modelId: string;
  onChange: (id: string) => void;
}) {
  const index = PRINT_MODELS.findIndex((m) => m.id === printModelById(modelId).id);

  // La navigation boucle : apres le dernier vient le premier.
  const aller = (pas: number) => {
    const suivant = (index + pas + PRINT_MODELS.length) % PRINT_MODELS.length;
    onChange(PRINT_MODELS[suivant].id);
  };

  /*
   * Les fleches du clavier font la meme chose que les boutons. Aucun champ de
   * saisie sur cette page, donc rien a proteger d'une capture globale.
   */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") aller(-1);
      else if (e.key === "ArrowRight") aller(1);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  });

  return (
    <div className="carrousel">
      <button
        type="button"
        className="carrousel__fleche"
        aria-label="Modèle précédent"
        onClick={() => aller(-1)}
      >
        ←
      </button>

      <p className="carrousel__nom" aria-live="polite">
        {PRINT_MODELS[index].nom}
        <span>
          {index + 1} / {PRINT_MODELS.length}
        </span>
      </p>

      <button
        type="button"
        className="carrousel__fleche"
        aria-label="Modèle suivant"
        onClick={() => aller(1)}
      >
        →
      </button>
    </div>
  );
}
```

- [ ] **Étape 2 : ajouter son style à la fin de `app/print.css`**

```css
/* --- Le carrousel de modeles ----------------------------------------------- */

.carrousel {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.carrousel__fleche {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink-soft);
  font-size: 1.1rem;
  cursor: pointer;
  transition:
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.carrousel__fleche:hover {
  border-color: var(--accent);
  color: var(--accent-dark);
}

.carrousel__nom {
  min-width: 10rem;
  text-align: center;
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.05rem;
  color: var(--ink);
}

.carrousel__nom span {
  display: block;
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

@media print {
  .carrousel {
    display: none;
  }
}
```

- [ ] **Étape 3 : vérifier**

Commandes : `npm run typecheck` puis `npm run check`
Attendu : les deux silencieux.

- [ ] **Étape 4 : committer**

```bash
git add components/PrintableCard.tsx components/PrintCarousel.tsx app/print.css
git commit -m "Ajoute le carrousel et la coquille a deux panneaux"
```

---

## Tâche 5 : les quatre compositions

**Fichiers :**
- Modifier : `app/print.css`

- [ ] **Étape 1 : ajouter les blocs, avant `/* --- Impression --- */`**

```css
/* --- Les quatre compositions ----------------------------------------------- */

/*
 * `centre` est la disposition d'origine, portee sur deux panneaux : tout centre
 * verticalement, le QR de taille moyenne au dos. Elle sert de base, les trois
 * autres ne font que s'en ecarter.
 */

/* Cadre : un filet interieur, et le decor seme a l'interieur. */
.feuille--cadre .feuille__panneau::after {
  content: "";
  position: absolute;
  inset: 8mm;
  border: 0.4mm solid var(--accent-soft);
  border-radius: 3px;
  pointer-events: none;
}

.feuille--cadre .feuille__titre {
  font-size: 19pt;
}

.feuille--cadre .feuille__qr {
  width: 42mm;
  height: 42mm;
}

/*
 * Bandeau : un aplat d'accent occupe le tiers superieur de la couverture et
 * porte le mot d'ouverture en reserve. Le titre vient dessous, sur le papier.
 */
.feuille--bandeau .feuille__couv {
  align-content: start;
  padding-top: 0;
}

.feuille--bandeau .feuille__couv::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 62mm;
  background: var(--accent);
  z-index: -1;
}

.feuille--bandeau .feuille__to,
.feuille--bandeau .feuille__intro {
  color: #fff;
}

.feuille--bandeau .feuille__to {
  margin-top: 18mm;
}

.feuille--bandeau .feuille__titre {
  margin-top: 26mm;
}

.feuille--bandeau .feuille__dos {
  align-content: start;
  padding-top: 24mm;
}

/*
 * Affiche : le titre prend la couverture, aligne a gauche. Le QR passe pleine
 * largeur au dos — c'est le plus grand des quatre.
 */
.feuille--affiche .feuille__couv {
  justify-items: start;
  text-align: left;
  align-content: center;
}

.feuille--affiche .feuille__titre {
  font-size: 34pt;
  line-height: 1.05;
}

.feuille--affiche .feuille__to {
  font-size: 13pt;
}

.feuille--affiche .feuille__qr {
  width: 60mm;
  height: 60mm;
}
```

- [ ] **Étape 2 : vérifier chaque composition à l'écran**

Lancer le serveur avec `preview_start`, ouvrir `/admin/<token>/imprimer`, et
parcourir les dix modèles aux flèches. Contrôler pour chacun : le titre ne
déborde pas, le QR reste dans son panneau, le repère de pli tombe au centre.

- [ ] **Étape 3 : committer**

```bash
git add app/print.css
git commit -m "Dessine les quatre compositions de carte"
```

---

## Tâche 6 : vérification d'ensemble

- [ ] **Étape 1 : la chaîne complète**

Commandes : `npm run typecheck`, `npm run check`, `npm run build`
Attendu : les trois sans erreur.

- [ ] **Étape 2 : l'aperçu avant impression**

Dans le navigateur, contrôler que la boîte de la feuille mesure bien
297 × 210 mm hors transformation, et que le `@page` déclare A4 paysage.

- [ ] **Étape 3 : mettre le README à jour**

Remplacer la section « La carte à imprimer » : le format n'est plus A6, et il y
a désormais dix modèles.

- [ ] **Étape 4 : committer**

```bash
git add README.md
git commit -m "Documente les modeles de carte imprimable"
```

---

## Ce qui ne peut pas être vérifié ici

Le rendu papier, le sens du pli, les marges réelles de l'imprimante et la
lisibilité du QR une fois imprimé. La géométrie à l'écran et l'aperçu avant
impression du navigateur sont contrôlables ; le premier tirage revient à
l'auteur du projet, et c'est lui qui confirmera que la couverture tombe du bon
côté après pliage.
