# L'étape des cadeaux — plan d'implémentation

> **Pour un agent :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> sont cochables (`- [ ]`).

**But :** remplacer les six contrôles à plat de la ligne de cadeau par deux zones nommées, fusionner
les trois façons de poser une image dans la vignette, et faire profiter le large du même
redécoupage.

**Approche :** la spec `docs/superpowers/specs/2026-09-10-etape-cadeaux-lisibilite-design.md` fait
foi. Deux conteneurs réels (`.row__source`, `.row__gift`) remplacent les `grid-template-areas` qui
réordonnaient la ligne contre le DOM. Un seul seuil, 40 rem, celui qui existe déjà. Les trois
garde-fous s'écrivent **avant** le code qu'ils protègent, et se testent par mutation.

**Le piège de cette implémentation**, mesuré avant d'écrire le plan : `<input type="file" hidden>`
est `display: none`, donc non focalisable — `focus()` dessus laisse le focus sur `body`. Le bouton
« Téléverser » d'aujourd'hui est déjà inatteignable au clavier, ce qui ne se voit pas parce que deux
autres chemins subsistent. Les supprimer en gardant `hidden` couperait le clavier de l'image. L'input
est donc masqué en CSS, pas par l'attribut, et la tâche 1 pose le garde-fou correspondant.

**Outils :** Next 15 / React 19, CSS écrit à la main dans `app/editor.css`, harnais maison
`scripts/check.ts` (pas de Jest), mesure au navigateur via le volet Browser.

> **La base n'est pas verte sur une copie de travail Windows.** Constaté en exécutant la tâche 1 :
> `main` lui-même échoue sur deux vérifications, `le soulevement au survol epargne les ecrans
> tactiles` et `le titre du voile est precede d'un silence`. Le CSS qu'elles protègent est intact ;
> c'est `core.autocrlf=true` qui rend les fichiers CRLF, et leurs regex cherchent un `\n` nu. Elles
> passent dans le conteneur Linux où le dépôt a été développé.
>
> **Hors périmètre de ce plan — ne pas les corriger ici.** Toutes les sorties attendues ci-dessous
> comptent donc **2 échecs préexistants** en plus des échecs propres à chaque étape. « Vert » signifie
> partout : ces deux-là et rien d'autre.
>
> Le même piège a été trouvé dans un garde-fou de la tâche 1 avant qu'il ne soit commité — d'où
> `/\shidden\s/` plutôt que `/\n\s+hidden\n/`. Toute nouvelle assertion de ce plan doit tolérer
> `\r\n`.

---

## Ce qu'on touche

| fichier | rôle dans ce plan |
|---|---|
| `scripts/check.ts` | trois garde-fous, écrits en premier |
| `app/editor.css` | les règles `.row__*` : deux zones, vignette unique, un seuil |
| `components/editor/PageEditor.tsx` | le JSX de l'étape 2, lignes 928-1076 |
| `README.md` | une phrase qui décrit le champ Image supprimé |

Aucun autre fichier. Pas de migration, pas de route, pas de validation touchée.

---

### Tâche 1 : les garde-fous de la vignette — cible tactile et clavier

La vignette devient le **seul** chemin vers le sélecteur de fichier. Deux façons de la rendre
inatteignable, et aucune ne se voit à la relecture : sous 44 px de côté elle échappe au pouce
(WCAG 2.5.8), et avec un `hidden` sur son input elle échappe au clavier. Un garde-fou chacune.

**Fichiers :**
- Modifier : `scripts/check.ts` — insérer après la fin du test « l'occasion est la premiere des
  trois etapes » (la ligne `  });` qui suit `assert.ok(cadeaux < presentation, …)`, vers la ligne
  1423), à l'intérieur du bloc `{ … }` ouvert ligne 1297.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
  test("la vignette du cadeau reste une cible tactile", () => {
    /*
     * La vignette a absorbe le cadre de collage, le champ d'adresse et le bouton
     * « Televerser » : elle est desormais le seul chemin vers le selecteur de
     * fichier. Sous 44 px de cote (WCAG 2.5.8) elle devient inatteignable au
     * pouce, et c'est au telephone qu'elle est la plus petite.
     *
     * On lit la regle comme du texte : `getComputedStyle` demanderait un
     * navigateur, et le harnais tourne sans.
     */
    const css = readFileSync(new URL("../app/editor.css", import.meta.url), "utf8");
    const i = css.indexOf("\n.row__thumb {");
    assert.notEqual(i, -1, "regle .row__thumb introuvable");
    const regle = css.slice(i, css.indexOf("\n}", i));

    for (const axe of ["min-width", "min-height"]) {
      const m = new RegExp(`${axe}:\\s*([\\d.]+)rem`).exec(regle);
      assert.ok(m, `la vignette n'impose plus de ${axe}`);
      assert.ok(Number(m[1]) * 16 >= 44, `${axe} de ${Number(m[1]) * 16} px, minimum 44`);
    }
  });
```

- [ ] **Étape 2 : le lancer et constater l'échec**

```bash
npm run check
```

Attendu : `3 échec(s)` — les 2 préexistants, plus `la vignette du cadeau reste une cible tactile /
regle .row__thumb introuvable`. La règle n'existe pas encore : c'est le bon échec.

- [ ] **Étape 3 : ajouter le garde-fou du clavier, juste après**

```ts
  test("la vignette du cadeau reste atteignable au clavier", () => {
    /*
     * Mesure au navigateur : un `<input type="file" hidden>` est `display: none`,
     * donc non focalisable — `focus()` dessus laisse le focus sur `body`. Le
     * bouton « Televerser » d'hier l'etait deja ; ca ne se voyait pas parce que
     * le champ d'adresse d'image et la vignette `tabIndex={0}` offraient deux
     * autres chemins. Ils ont disparu tous les deux : `hidden` ici couperait le
     * clavier de l'image, sans qu'aucun test de rendu ne bronche.
     *
     * L'attribut est donc refuse, et la regle de masquage clippee exigee.
     */
    const editeur = readFileSync(
      new URL("../components/editor/PageEditor.tsx", import.meta.url),
      "utf8",
    );
    /* Une regex plutot qu'un indexOf : l'indentation exacte du JSX n'a pas a
       faire echouer un garde-fou sur l'accessibilite. */
    const m = /<label\s+className=\{`row__thumb[\s\S]*?<\/label>/.exec(editeur);
    assert.ok(m, "vignette-label introuvable");
    const vignette = m[0];
    assert.match(vignette, /type="file"/, "l'input de fichier a quitte la vignette");
    /*
     * `\s` et non `\n` : `core.autocrlf` rend les fichiers CRLF dans la copie de
     * travail, et une regex qui exige un `\n` juste apres le mot ne matche alors
     * jamais — l'assertion passerait avec `hidden` present. Deux garde-fous plus
     * anciens du fichier sont tombes dans ce piege.
     */
    assert.doesNotMatch(
      vignette,
      /\shidden\s/,
      "`hidden` de retour sur l'input : display:none n'est pas focalisable",
    );

    const css = readFileSync(new URL("../app/editor.css", import.meta.url), "utf8");
    const j = css.indexOf('\n.row__thumb input[type="file"] {');
    assert.notEqual(j, -1, "regle de masquage de l'input introuvable");
    const regle = css.slice(j, css.indexOf("\n}", j));
    assert.doesNotMatch(regle, /display:\s*none/, "masquage revenu a display:none");
    assert.doesNotMatch(regle, /visibility:\s*hidden/, "masquage revenu a visibility:hidden");
    assert.match(regle, /opacity:\s*0/, "l'input n'est plus masque");
  });
```

- [ ] **Étape 4 : le lancer et constater les deux échecs**

```bash
npm run check
```

Attendu : `4 échec(s)` — les 2 préexistants, plus les deux garde-fous de la vignette, le second
disant `vignette-label introuvable`.

- [ ] **Étape 5 : commiter les deux garde-fous**

```bash
git add scripts/check.ts && git commit -m "Garde-fous : la vignette est une cible tactile et reste au clavier

Ecrits avant le code qu'ils protegent : ils echouent aujourd'hui parce que
.row__thumb n'existe pas encore.

Le second vient d'une mesure : <input type=\"file\" hidden> est display:none,
donc non focalisable. Le bouton « Televerser » d'aujourd'hui l'est deja,
masque par deux autres chemins vers l'image qui vont disparaitre.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tâche 2 : le garde-fou de l'ordre de lecture

Les `grid-template-areas` faisaient remonter l'adresse produit au-dessus de la vignette sans toucher
au DOM. Elles disparaissent : l'ordre du DOM redevient l'unique porteur de la hiérarchie, et c'est
exactement ce qu'un remaniement inverse en silence.

**Fichiers :**
- Modifier : `scripts/check.ts` — juste après le test de la tâche 1.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
  test("la ligne de cadeau lit sa provenance avant son contenu", () => {
    /*
     * L'ordre de lecture d'une ligne est : d'ou vient ce cadeau, puis ce qu'on
     * en montre. Il tenait sur des `grid-template-areas` qui reordonnaient la
     * grille contre l'ordre du DOM ; elles sont parties au profit de deux
     * conteneurs reels. Plus rien ne rattraperait donc une inversion du JSX —
     * d'ou ce garde-fou, et la verification que `.row__grid` ne ressuscite pas.
     */
    const editeur = readFileSync(
      new URL("../components/editor/PageEditor.tsx", import.meta.url),
      "utf8",
    );
    /*
     * Le type de guillemets et la presence d'un litteral gabarit sont des
     * details de style : les figer ferait echouer ce garde-fou sur une reecriture
     * innocente du `className`, avec un message parlant d'une zone absente. La
     * frontiere de mot, elle, est necessaire — sans elle `row__gift` matcherait
     * `row__gift-grid`, qui vit dans la zone au lieu de la designer.
     */
    const positionDe = (classe: string) => {
      const m = new RegExp(`className=\{?[\`"'][^\`"']*${classe}(?![\w-])`).exec(editeur);
      return m ? m.index : -1;
    };
    const source = positionDe("row__source");
    const cadeau = positionDe("row__gift");
    assert.notEqual(source, -1, "aucun element ne porte la classe row__source");
    assert.notEqual(cadeau, -1, "aucun element ne porte la classe row__gift");
    assert.ok(source < cadeau, "row__gift est passe devant row__source")

    const css = readFileSync(new URL("../app/editor.css", import.meta.url), "utf8");
    assert.doesNotMatch(
      css,
      /\.row__grid[\s,{]/,
      "row__grid ressuscite : l'ordre de la ligne repasserait par la grille",
    );
  });
```

- [ ] **Étape 2 : le lancer et constater l'échec**

```bash
npm run check
```

Attendu : `5 échec(s)`, le nouveau disant **`aucun element ne porte la classe row__gift`**.

Et non pas `row__source` : contrairement à ce que ce plan a d'abord annoncé, `row__source` **existe
déjà** dans le JSX d'aujourd'hui, à l'intérieur de `row__grid` — c'est `row__gift` qui manque. Le
premier agent à qui la mauvaise attente avait été donnée s'est arrêté et l'a signalé plutôt que de
deviner ; c'est le bon réflexe, et cette ligne est corrigée grâce à lui.

- [ ] **Étape 3 : commiter**

```bash
git add scripts/check.ts && git commit -m "Garde-fou : l'ordre du DOM porte l'ordre de lecture de la ligne

Les grid-template-areas vont disparaitre ; ce test prend le relais et
refuse leur retour.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tâche 3 : le CSS des deux zones

**Fichiers :**
- Modifier : `app/editor.css` — remplacer tout le bloc allant du commentaire « Trois zones nommees
  plutot qu'un ordre de DOM » (vers la ligne 956) jusqu'à la fin de `.row__fields .notice` (vers la
  ligne 1067), c'est-à-dire tout ce qui suit `.icon-btn--danger:hover:not(:disabled) { … }` et
  précède le commentaire `/* --- Actions --- */`.

- [ ] **Étape 1 : remplacer le bloc**

Supprimer les règles `.row__grid`, `.row__source` (ancienne), la media query `@media (min-width:
40rem)` qui redéfinit `.row__grid`, la media query `@media (max-width: 39.999rem)` qui vise
`.row__preview--empty`, `.row__preview`, `.row__preview:hover`, `.row__preview.is-busy`,
`.row__preview img`, `.row__preview span`, `.row__fields` et `.row__fields .notice`. Les remplacer
par :

```css
/*
 * Deux zones nommees, dans l'ordre de la question qu'on se pose : d'ou vient ce
 * cadeau, puis ce qu'on en montre.
 *
 * Ce que ca remplace : six controles de meme poids et des `grid-template-areas`
 * qui remontaient l'adresse produit au-dessus de la vignette contre l'ordre du
 * DOM. Mesure a 375x812, une ligne vide : 651 px, soit 80 % de la fenetre. A
 * 1440 : 481 px, dont ~350 px de colonne gauche vide sous une vignette de 102,
 * et des champs Titre et Note etires a 632 px pour 80 et 200 caracteres.
 *
 * L'ordre du DOM est desormais l'ordre de lecture a toutes les largeurs ; seul
 * l'enroulement de la zone cadeau change au seuil de 40 rem, celui qui existait
 * deja.
 */
.row__source {
  background: var(--paper-warm);
  border-radius: var(--radius-sm);
  padding: 0.7rem;
  margin-bottom: 0.85rem;
  min-width: 0;
}

/*
 * Le message de l'extraction rend compte du geste « Recuperer ». Il vivait sous
 * la note, a l'autre bout de la ligne.
 */
.row__source .notice {
  margin-top: 0.6rem;
  margin-bottom: 0;
}

.row__zone-label {
  display: block;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--ink-soft);
  margin-bottom: 0.5rem;
}

.row__gift {
  border-top: 1px solid var(--line);
  padding-top: 0.75rem;
}

.row__zone-label--gift {
  color: var(--ink-faint);
  margin-bottom: 0.6rem;
}

.row__gift-grid {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  grid-template-areas:
    "thumb title"
    "note note";
  gap: 0.75rem;
  align-items: start;
}

/*
 * Au large, la vignette cesse d'avoir une colonne a elle : elle devient une case
 * dans une rangee de trois. C'est ce qui supprime les ~350 px de vide sous elle,
 * et ce qui ramene Titre et Note de 632 a ~310 px.
 */
@media (min-width: 40rem) {
  .row__gift-grid {
    grid-template-columns: 7.5rem minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas: "thumb title note";
  }
}

.row__thumb-wrap {
  grid-area: thumb;
  position: relative;
}

.row__title {
  grid-area: title;
  min-width: 0;
}

.row__note {
  grid-area: note;
  min-width: 0;
}

/*
 * `.field:first-of-type` pose 0.75rem de marge haute ; dans une case de grille
 * elle decalerait Titre et Note d'une ligne sous le haut de la vignette.
 */
.row__title .field,
.row__note .field {
  margin-top: 0;
}

/*
 * La vignette est un `<label>` : cliquer ouvre le selecteur — la galerie ou
 * l'appareil photo au telephone — sans JavaScript ni gestion de focus a
 * reinventer, et l'`<input type="file">` cache la rend atteignable au clavier.
 *
 * Les minimums sont la cible tactile : elle est le seul chemin vers le
 * selecteur depuis que le champ d'adresse d'image a disparu. `scripts/check.ts`
 * les tient.
 */
.row__thumb {
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--line);
  background: linear-gradient(150deg, var(--paper-warm), #ece0cf);
  overflow: hidden;
  cursor: pointer;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);
}

.row__thumb:hover,
.row__thumb:focus-within {
  border-color: var(--accent);
  border-style: solid;
  box-shadow: 0 0 0 3px rgba(176, 83, 60, 0.13);
}

/*
 * Masque, mais focalisable. `hidden` — et tout `display: none` ou
 * `visibility: hidden` — retire l'input de l'ordre de tabulation : mesure faite,
 * `focus()` dessus laisse le focus sur `body`. Depuis que la vignette est le
 * seul chemin vers l'image, ce serait couper le clavier. `scripts/check.ts`
 * refuse le retour de l'attribut comme celui de la propriete.
 */
.row__thumb input[type="file"] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.row__thumb.is-busy {
  opacity: 0.6;
  pointer-events: none;
}

.row__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.row__thumb span {
  font-size: 0.7rem;
  color: var(--ink-faint);
  text-align: center;
  padding: 0 0.35rem;
  line-height: 1.3;
}

/*
 * La croix vit sur la vignette et non a cote : effacer une image est un geste
 * qui vise l'image. 1.5rem de cote, sous les 44 px de la cible tactile — c'est
 * assume, l'action est reversible d'un clic et son voisin de 88 px ne l'est pas.
 */
.row__thumb-clear {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-soft);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
}

.row__thumb-clear:hover {
  background: rgba(156, 53, 53, 0.08);
  color: var(--danger);
  border-color: rgba(156, 53, 53, 0.3);
}
```

- [ ] **Étape 2 : vérifier que le garde-fou tactile passe**

```bash
npm run check
```

Attendu : `4 échec(s)` — les 2 préexistants, plus les 2 imputables au JSX qui n'est pas encore fait
(`vignette : aucun <label> ne porte la classe row__thumb` et `aucun element ne porte la classe
row__gift`). Le test « la vignette du cadeau reste une cible tactile », lui, a disparu des échecs :
c'est le seul des trois que le CSS seul pouvait satisfaire, et le retrait de `.row__grid` a levé au
passage la seconde assertion du garde-fou de l'ordre.

- [ ] **Étape 3 : commiter**

```bash
git add app/editor.css && git commit -m "Redecoupe la ligne de cadeau en deux zones

Mesure a 375x812 : une ligne vide occupait 651 px, 80 % de la fenetre, et
6 510 px pour dix cadeaux. A 1440 : 481 px, dont ~350 px de colonne gauche
vide sous une vignette de 102, et des champs Titre et Note etires a 632 px
pour 80 et 200 caracteres.

Cause : six controles de meme poids, une vignette a qui on donnait une
colonne entiere, et des grid-template-areas qui portaient la hierarchie a
la place du DOM.

Deux conteneurs reels remplacent la grille nommee, la vignette devient une
case carree dans une rangee, et le seul enroulement de la zone cadeau
change au seuil de 40 rem — celui qui existait deja.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tâche 4 : le JSX de la ligne

**Fichiers :**
- Modifier : `components/editor/PageEditor.tsx` — remplacer le corps du `<li className="row">`,
  c'est-à-dire de la ligne qui suit `</div>` fermant `row__head` (vers 966) jusqu'au `</div>`
  fermant `row__grid` (vers 1073). L'en-tête `row__head` et ses trois `icon-btn` sont **inchangés**.

- [ ] **Étape 1 : remplacer le bloc**

Supprimer le commentaire « L'adresse du produit est sortie de `row__fields` » et tout le
`<div className="row__grid">…</div>`. Mettre à la place :

```tsx
                {/*
                  L'ordre du DOM est l'ordre de lecture : d'ou vient ce cadeau,
                  puis ce qu'on en montre. Il passait par `grid-template-areas`,
                  qui remontaient l'adresse produit au-dessus de la vignette au
                  telephone en contredisant le DOM. Deux conteneurs reels le
                  disent maintenant a toutes les largeurs, et `scripts/check.ts`
                  refuse leur inversion.
                */}
                <div className="row__source">
                  {/*
                    L'intitule enonce les deux roles du champ. L'ancien — « Jamais
                    affichee sur la page-cadeau » — disait ce qu'il ne fait pas, et
                    taisait le second : `source_url` est stocke, et AdminView le
                    ressert au donneur apres le choix sous « Ouvrir la page
                    d'origine ». C'est le lien d'achat.
                  */}
                  <span className="row__zone-label">
                    Colle l&apos;adresse d&apos;un produit : elle remplit le titre et
                    l&apos;image, et te revient après le choix pour acheter. Facultative — un
                    cadeau qui ne s&apos;achète pas en ligne se décrit très bien à la main.
                  </span>
                  <div className="inline">
                    <input
                      type="url"
                      inputMode="url"
                      value={row.source_url}
                      aria-label={`Adresse de la page produit du cadeau ${index + 1}`}
                      placeholder="https://…"
                      onChange={(e) => patchItem(row.key, { source_url: e.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={row.busy !== null}
                      onClick={() => extract(row.key)}
                    >
                      {row.busy === "extract" ? "…" : "Récupérer"}
                    </button>
                  </div>
                  {row.hint && <p className="notice notice--info">{row.hint}</p>}
                </div>

                <div className="row__gift">
                  <span className="row__zone-label row__zone-label--gift">
                    Ce que verra la personne
                  </span>
                  <div className="row__gift-grid">
                    <div className="row__thumb-wrap">
                      {/*
                        Un `<label>`, et non un `<div role="button">` : cliquer
                        ouvre le selecteur — galerie ou appareil photo au
                        telephone — sans JavaScript, et l'`<input type="file">`
                        cache porte le focus clavier.

                        Coller y marche toujours : le gestionnaire vit sur la
                        ligne entiere et ne s'efface que sur les champs de
                        saisie. Retirer le champ d'adresse d'image a donc
                        *elargi* la surface de collage.
                      */}
                      <label
                        className={`row__thumb${row.busy === "upload" ? " is-busy" : ""}`}
                      >
                        {/*
                          Pas d'attribut `hidden` : il vaut display:none, qui
                          retire l'input de l'ordre de tabulation. Le masquage
                          est en CSS, clippe, pour que le clavier garde un
                          chemin vers l'image — il n'en a plus d'autre.
                        */}
                        <input
                          type="file"
                          accept={ACCEPTED_IMAGE_TYPES.join(",")}
                          disabled={row.busy !== null}
                          aria-label={`Image du cadeau ${index + 1}`}
                          onChange={(e) => {
                            void upload(row.key, e.target.files?.[0] ?? null);
                            e.target.value = "";
                          }}
                        />
                        {row.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.image_url} alt="" />
                        ) : (
                          <span>
                            {row.busy === "upload" ? "envoi…" : "choisis ou colle une image"}
                          </span>
                        )}
                      </label>
                      {row.image_url && row.busy === null && (
                        <button
                          type="button"
                          className="row__thumb-clear"
                          aria-label={`Retirer l'image du cadeau ${index + 1}`}
                          onClick={() => patchItem(row.key, { image_url: "" })}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="row__title">
                      <Field label="Titre">
                        <input
                          type="text"
                          value={row.label}
                          aria-label={`Titre du cadeau ${index + 1}`}
                          maxLength={LIMITS.itemLabel}
                          placeholder="Collier Fluorite"
                          onChange={(e) => patchItem(row.key, { label: e.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="row__note">
                      <Field label="Note" help="Facultatif. Un mot pour situer le cadeau.">
                        <input
                          type="text"
                          value={row.note}
                          aria-label={`Note du cadeau ${index + 1}`}
                          maxLength={LIMITS.itemNote}
                          placeholder="Un soir de semaine, sans se presser"
                          onChange={(e) => patchItem(row.key, { note: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
```

- [ ] **Étape 2 : ajuster le texte d'aide de l'étape**

Le paragraphe `<p className="help">` de l'étape 2 (vers la ligne 919) dit « Colle l'adresse d'un
produit pour récupérer le titre et l'image, ou remplis tout à la main. » — c'est maintenant la
ligne elle-même qui le dit, et le répéter en tête ajoute du bruit. Remplacer les deux phrases par :

```tsx
          <p className="help">
            Jusqu&apos;à {LIMITS.itemsMax} propositions, dans l&apos;ordre que tu veux.
            {filledCount === 1 && (
              <>
                {" "}
                <strong>Avec un seul cadeau</strong>, la carte devient une annonce : rien à choisir,
                juste un accusé de réception.
              </>
            )}
          </p>
```

- [ ] **Étape 3 : vérifier les trois portes**

```bash
npm run check && npx tsc --noEmit && npm run build
```

Attendu : `npm run check` ne laisse que les **2 échecs préexistants** — les trois garde-fous de ce
plan sont passés au vert. `tsc` ne dit rien, le build réussit. Si `tsc` se plaint d'un `imageUrlFromClipboard` désormais inutilisé, **ne pas le retirer** :
il sert toujours dans `handlePaste`.

- [ ] **Étape 4 : commiter**

```bash
git add components/editor/PageEditor.tsx && git commit -m "Fusionne les trois facons de poser une image dans la vignette

Le cadre de collage, le champ « Adresse de l'image » et le bouton
« Televerser » ecrivaient tous `image_url` en se presentant comme trois
choses distinctes. La vignette devient un <label> portant l'input file :
cliquer ouvre la galerie, coller marche toujours — le gestionnaire vit sur
la ligne et ne s'efface que sur les champs de saisie, donc retirer le champ
d'adresse a elargi la surface de collage — et une croix efface.

L'intitule de la zone source enonce les deux roles du lien au lieu de nier
le second : il remplit le titre et l'image, et AdminView le ressert au
donneur apres le choix pour acheter.

Le message de l'extraction remonte dans la zone qui l'a produit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tâche 5 : tester les trois garde-fous par mutation

Sans cette étape on écrit des vérifications décoratives, et c'est déjà arrivé dans ce dépôt.

- [ ] **Étape 1 : casser la cible tactile**

Dans `app/editor.css`, remplacer `min-height: 2.75rem;` de `.row__thumb` par `min-height: 2rem;`.

```bash
npm run check
```

Attendu : `✗ la vignette du cadeau reste une cible tactile / min-height de 32 px, minimum 44`.
Si le test passe, il est décoratif — le réparer avant de continuer. Remettre `2.75rem`.

- [ ] **Étape 2 : casser l'ordre de lecture**

Dans `components/editor/PageEditor.tsx`, intervertir les deux blocs : mettre
`<div className="row__gift">…</div>` **avant** `<div className="row__source">…</div>`.

```bash
npm run check
```

Attendu : `✗ la ligne de cadeau lit sa provenance avant son contenu / row__gift est passe devant
row__source`. Remettre l'ordre.

- [ ] **Étape 3 : casser l'accès clavier**

Dans `components/editor/PageEditor.tsx`, remettre l'attribut `hidden` sur l'`<input type="file">` de
la vignette.

```bash
npm run check
```

Attendu : `✗ la vignette du cadeau reste atteignable au clavier / \`hidden\` de retour sur l'input :
display:none n'est pas focalisable`. Retirer l'attribut.

Puis, dans `app/editor.css`, remplacer `opacity: 0;` de `.row__thumb input[type="file"]` par
`display: none;`.

```bash
npm run check
```

Attendu : `✗ … / masquage revenu a display:none`. Remettre `opacity: 0`.

- [ ] **Étape 4 : casser le retour de `.row__grid`**

Dans `app/editor.css`, ajouter en fin de fichier `.row__grid { display: grid; }`.

```bash
npm run check
```

Attendu : `✗ … / row__grid ressuscite : l'ordre de la ligne repasserait par la grille`. Retirer la
règle.

- [ ] **Étape 5 : confirmer le retour au vert**

```bash
npm run check
git status --short
```

Attendu : les 2 échecs préexistants et rien d'autre, et `git status` propre — toutes les mutations ont bien
été défaites.

---

### Tâche 6 : mesurer, et seulement ensuite conclure

C'est la règle du dépôt. Les chiffres annoncés dans la spec sont des estimations tant qu'ils ne
sont pas relevés.

- [ ] **Étape 1 : servir la version compilée**

```bash
npm run build
```

Puis ouvrir le serveur de développement dans le volet Browser (`preview_start`, configuration
`mypresentsforyou`) et naviguer vers `/creer`.

- [ ] **Étape 2 : relever la hauteur au téléphone**

Passer la fenêtre en 375 × 812, cliquer « Suivant : les cadeaux », puis exécuter :

```js
const r = document.querySelector('.row').getBoundingClientRect();
JSON.stringify({
  docW: document.documentElement.scrollWidth,
  vw: innerWidth,
  rowH: Math.round(r.height),
  panelH: Math.round(document.querySelector('.panel').getBoundingClientRect().height),
  thumb: (() => { const t = document.querySelector('.row__thumb').getBoundingClientRect();
                  return [Math.round(t.width), Math.round(t.height)]; })(),
})
```

Attendu : `rowH` autour de 310 (contre 651 relevés avant), `thumb` proche de `[88, 88]`, et
`docW === vw === 375` — aucun débordement horizontal.

- [ ] **Étape 3 : relever la hauteur au large**

Passer la fenêtre en 1440 × 900, puis exécuter :

```js
const g = e => { const r = e.getBoundingClientRect();
                 return { w: Math.round(r.width), h: Math.round(r.height) }; };
const row = document.querySelector('.row');
JSON.stringify({
  row: g(row),
  thumb: g(row.querySelector('.row__thumb')),
  titre: g(row.querySelector('.row__title input')),
  note: g(row.querySelector('.row__note input')),
})
```

Attendu : `row.h` autour de 330 (contre 481 avant), `thumb` proche de `[120, 120]`, et `titre.w`
comme `note.w` autour de 310 — plus de champ à 632 px, plus de colonne morte.

- [ ] **Étape 4 : vérifier les deux gestes qui ont changé**

Sur la vignette d'un cadeau : cliquer doit ouvrir le sélecteur de fichier. Coller une adresse
d'image (`Ctrl+V` hors d'un champ de saisie) doit la poser dans la vignette — c'est le chemin qui
remplaçait le champ supprimé, et le seul qu'on ne peut pas vérifier en lisant le code. Une image
posée doit faire apparaître la croix, et la croix doit vider la vignette.

Puis l'accès clavier, celui qui a motivé le troisième garde-fou :

```js
const f = document.querySelector('.row__thumb input[type="file"]');
f.focus();
JSON.stringify({
  focalisable: document.activeElement === f,
  anneau: document.querySelector('.row__thumb').matches(':focus-within'),
})
```

Attendu : `focalisable: true` et `anneau: true`. C'était `false` avant ce changement — le relever
est ce qui distingue le gain réel de l'intention.

- [ ] **Étape 5 : consigner les mesures**

Si un chiffre s'écarte nettement de l'attendu, **ne pas ajuster le chiffre dans la spec** : comprendre
l'écart d'abord. Sinon, reporter les valeurs relevées dans le message de la pull request.

---

### Tâche 7 : la phrase du README que le changement rend fausse

**Fichiers :**
- Modifier : `README.md:1053-1058`, paragraphe « Une image se colle, elle ne se téléverse pas
  forcément. »

- [ ] **Étape 1 : corriger**

La phrase « Coller une simple adresse d'image sur la vignette remplit le champ Image. » décrit un
champ qui n'existe plus. Remplacer le paragraphe par :

```markdown
**Une image se colle, elle ne se téléverse pas forcément.** Sur chaque ligne de cadeau, `Ctrl+V`
accepte une capture d'écran, une image copiée depuis une page marchande, ou un fichier copié dans
l'explorateur — que le curseur soit dans un champ ou sur la vignette. Coller une simple adresse
d'image la pose directement dans la vignette : c'est ce qui remplace le champ « Adresse de l'image »,
supprimé avec les deux autres façons de poser une image. Un collage de texte dans un champ de saisie
n'est jamais détourné. L'image passe par `/api/upload` comme un téléversement : il faut bien une URL
en base, on ne stocke pas de `data:` URI — donc `BLOB_READ_WRITE_TOKEN` est requis pour cette voie.
```

- [ ] **Étape 2 : vérifier**

```bash
npm run check
```

Attendu : les 2 échecs préexistants et rien d'autre — le harnais lit le README pour les effets et
les décors, cette phrase ne les concerne pas, mais on confirme qu'on n'a rien cassé en éditant.

- [ ] **Étape 3 : commiter**

```bash
git add README.md && git commit -m "Corrige la description du collage d'une adresse d'image

Le README annoncait « remplit le champ Image » ; ce champ a disparu avec la
fusion des trois controles dans la vignette.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tâche 8 : pousser et ouvrir la pull request en brouillon

- [ ] **Étape 1 : passer les trois portes une dernière fois**

```bash
npm run check && npx tsc --noEmit && npm run build
```

- [ ] **Étape 2 : pousser**

```bash
git push -u origin claude/etape-cadeaux-lisibilite
```

- [ ] **Étape 3 : ouvrir la PR en brouillon**

`gh pr create --draft`, avec un corps qui décrit le défaut, la cause, la correction et **les
mesures relevées à la tâche 6** — pas la liste des fichiers touchés. Terminer par :

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
