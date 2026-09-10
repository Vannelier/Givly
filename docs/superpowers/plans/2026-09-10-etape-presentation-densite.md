# L'étape Présentation — plan d'implémentation

> **Pour un agent :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> sont cochables (`- [ ]`).

**But :** raccourcir l'étape 3 de l'éditeur au téléphone — 4 453 → ≈ 4 168 px à 375 — sans rien
cacher et sans ajouter d'interaction.

**Approche :** la spec `docs/superpowers/specs/2026-09-10-etape-presentation-densite-design.md` fait
foi. Cinq changements de CSS et de formulation, chacun déjà mesuré par simulation dans le navigateur ;
un seul garde-fou, écrit avant le code qu'il protège et testé par mutation ; puis une mesure sur le
code réel avant de conclure.

**Outils :** Next 15 / React 19, CSS écrit à la main dans `app/editor.css`, harnais maison
`scripts/check.ts` (pas de Jest), mesure au navigateur via le volet Browser.

---

## Ce qu'il faut savoir avant de commencer

**Branche.** `claude/etape-presentation-densite`, partie de `claude/etape-cadeaux-lisibilite` et non de
`main` : ce chantier touche les deux mêmes fichiers que quatre correctifs pas encore fusionnés, dont
celui du collage d'une adresse d'image. Ne pas rebaser sur `main`.

**La base n'est pas verte sur une copie de travail Windows.** `npm run check` rend
`2 échec(s) sur 166` avant toute modification : `le soulevement au survol epargne les ecrans tactiles`
et `le titre du voile est precede d'un silence`. Le CSS qu'elles protègent est intact ; c'est
`core.autocrlf=true` qui met la copie de travail en CRLF alors que leurs regex cherchent un `\n` nu.
**Hors périmètre, n'y touche pas.** Partout ci-dessous, « vert » signifie : ces deux-là et rien d'autre.

**Toute nouvelle assertion doit tolérer `\r\n`.** Une assertion `doesNotMatch` dont la regex ne peut
pas matcher passe toujours, y compris avec le défaut présent — deux garde-fous du chantier précédent
ont été décoratifs pour cette raison avant qu'une mutation ne le montre.

**Ne lance jamais `npm run build` pendant qu'un `next dev` sert.** Les deux se disputent le dossier
`.next` : le serveur de développement se met à répondre `Cannot find module './611.js'` et les pages
disparaissent. Arrête le serveur avant de construire ; pour le relancer ensuite, efface `.next`
d'abord.

**Conventions.** Le code parle français. **Les commentaires de code sont sans accents** et disent
*pourquoi*, jamais *quoi*. Les textes d'interface, eux, portent les accents.

---

## Ce qu'on touche

| fichier | rôle dans ce plan |
|---|---|
| `scripts/check.ts` | un garde-fou, écrit en premier |
| `app/editor.css` | échelle d'étapes, palettes, espacement de l'étape 3 |
| `components/editor/PageEditor.tsx` | quatre lignes d'aide, un commentaire |
| `README.md` | une phrase fausse sur l'aperçu au téléphone, et un paragraphe pour ce chantier |

---

### Tâche 1 : le garde-fou de l'échelle d'étapes

Les trois boutons de l'échelle font 39 px de haut à 375, et 41 px à 768 comme à 1440 : sous les 44 px
d'une cible tactile à toutes les largeurs. Le garde-fou s'écrit avant la règle qui le fera passer.

**Fichiers :**
- Modifier : `scripts/check.ts` — insérer **après** la fin du test
  `"coller une adresse d'image atteint la vignette"` (la ligne `  });` vers la ligne 1589) et **avant**
  `"la barre d'action porte des cibles tactiles et des bords visibles"` (vers la ligne 1591).

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
  test("l'echelle d'etapes reste une cible tactile", () => {
    /*
     * Les trois boutons de l'echelle — Occasion, Cadeaux, Presentation — font
     * 39 px de haut a 375, et 41 a 768 comme a 1440 : sous les 44 px d'une cible
     * tactile (WCAG 2.5.8) a toutes les largeurs. C'est la navigation entre
     * etapes, au bord haut de l'ecran.
     *
     * Toutes les regles `.stepper__btn` sont lues, pas la seule de base : elle
     * est deja redefinie dans une media query telephone, et c'est la qu'un
     * ajustement futur ramenerait la hauteur sous 44 px. Le garde-fou de la
     * vignette ne lisait que sa regle de base, et une media query le contournait
     * sans un bruit.
     */
    const css = readFileSync(new URL("../app/editor.css", import.meta.url), "utf8");
    const i = css.indexOf("\n.stepper__btn {");
    assert.notEqual(i, -1, "regle .stepper__btn introuvable");
    const fin = css.indexOf("\n}", i);
    assert.notEqual(fin, -1, "regle .stepper__btn non fermee en colonne 0");
    const base = /min-height:\s*([\d.]+)rem/.exec(css.slice(i, fin));
    assert.ok(base, "l'echelle d'etapes n'impose plus de min-height en rem");
    assert.ok(Number(base[1]) * 16 >= 44, `min-height de ${Number(base[1]) * 16} px, minimum 44`);

    for (const [, corps] of css.matchAll(/^[ \t]*\.stepper__btn\s*\{([^}]*)\}/gm)) {
      const m = /min-height:\s*([\d.]+)rem/.exec(corps);
      if (!m) continue;
      assert.ok(
        Number(m[1]) * 16 >= 44,
        `min-height de ${Number(m[1]) * 16} px dans une redefinition de .stepper__btn, minimum 44`,
      );
    }
  });
```

Pourquoi ces ancres tiennent en CRLF : `"\n.stepper__btn {"` trouve le `\n` de `\r\n` ; `^` en mode
`m` se place après chaque `\n` ; `[^}]*` traverse les `\r` sans difficulté. Et
`^[ \t]*\.stepper__btn\s*\{` ne peut pas attraper `.stepper__btn:disabled {` : le `:` n'est ni une
espace ni une accolade.

- [ ] **Étape 2 : le lancer et constater l'échec**

```bash
npm run check
```

Attendu : `3 échec(s) sur 167` — les 2 préexistants, plus
`l'echelle d'etapes reste une cible tactile / l'echelle d'etapes n'impose plus de min-height en rem`.
**Si le message diffère, arrête-toi et rapporte-le.**

```bash
npx tsc --noEmit
```

Attendu : silencieux.

- [ ] **Étape 3 : commiter**

Avec un heredoc `git commit -F -` :

```
Garde-fou : l'echelle d'etapes est une cible tactile

Les trois boutons de l'echelle font 39 px de haut a 375, et 41 a 768 comme
a 1440 : sous les 44 px d'une cible tactile a toutes les largeurs, pour la
navigation entre etapes.

Ecrit avant la regle qui le fera passer. Il lit toutes les redefinitions de
.stepper__btn et non la seule de base : la regle est deja redefinie dans une
media query telephone, et le garde-fou de la vignette s'etait fait
contourner exactement ainsi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 2 : l'échelle d'étapes à 44 px

**Fichiers :**
- Modifier : `app/editor.css:95-113` — la règle `.stepper__btn`.

- [ ] **Étape 1 : ajouter la hauteur minimale**

Dans la règle `.stepper__btn` (vers la ligne 95), juste après `width: 100%;`, ajoute :

```css
  /*
   * 44 px, la taille d'une cible tactile : sans elle, les boutons faisaient
   * 39 px a 375 et 41 a 768 comme a 1440. `scripts/check.ts` la tient, y
   * compris contre une redefinition en media query.
   */
  min-height: 2.75rem;
```

La redéfinition téléphone `@media (max-width: 30rem) { .stepper__btn { … } }` (vers la ligne 165) ne
pose que `font-size` et `padding` : **n'y ajoute rien.**

- [ ] **Étape 2 : vérifier que le garde-fou passe**

```bash
npm run check
```

Attendu : `2 échec(s) sur 167` — les deux préexistants seulement.

- [ ] **Étape 3 : commiter**

```
Porte l'echelle d'etapes a la taille d'une cible tactile

Mesure : 39 px de haut a 375, 41 a 768 comme a 1440, sous les 44 px d'une
cible tactile a toutes les largeurs — pour la navigation entre etapes, au
bord haut de l'ecran.

min-height: 2.75rem sur la regle de base. Mesure par simulation : les
boutons passent a 44 px aux trois largeurs, restent sur une rangee, sans
debordement, pour 5 px de plus sur la page a 375.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 3 : palettes en trois colonnes, espacement resserré

Deux changements de densité, mesurés par simulation à 375 : −164 px pour les palettes, −72 px pour
l'espacement (−152 px à 768).

**Fichiers :**
- Modifier : `app/editor.css:170-174` — la règle `.palettes`.
- Modifier : `app/editor.css`, après la media query `@media (min-width: 62rem)` du bloc `compose`
  (qui se termine vers la ligne 642, juste avant `/* --- Champs --- */`).

- [ ] **Étape 1 : les palettes**

Remplace :

```css
.palettes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
```

par :

```css
/*
 * Trois colonnes au telephone, quatre au-dela de 34 rem. En deux, la grille
 * faisait 401 px a 375 pour neuf palettes ; en trois, 237, et aucun nom ne
 * deborde de ses 95 px. Quatre y donneraient des tuiles d'environ 70 px, trop
 * etroites pour le nuancier et le nom.
 *
 * `minmax(0, 1fr)` et non `1fr` : une colonne `1fr` ne descend pas sous la
 * largeur minimale de son contenu, et un nom long l'aurait elargie.
 */
.palettes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}
```

La media query `@media (min-width: 34rem) { .palettes { … repeat(4, 1fr) } }` qui suit **ne change
pas**.

- [ ] **Étape 2 : l'espacement de l'étape 3**

Juste après la fermeture de `@media (min-width: 62rem) { … }` du bloc `compose`, et avant
`/* --- Champs --- */`, ajoute :

```css
/*
 * En colonne unique, l'etape 3 faisait 4 453 px a 375 — cinq ecrans et demi
 * pour quatorze champs. Resserrer ses marges rapporte 72 px a 375 et 152 a 768,
 * ou le rembourrage des cadres valait deja 1.6rem.
 *
 * Limite a `.compose` : `.field` et `.panel` servent aussi a l'etape des
 * cadeaux et aux autres ecrans. Limite aussi a la colonne unique : au-dela de
 * 62 rem l'etape passe en deux colonnes, et la regle n'y a aucun effet.
 *
 * `.compose .field:first-of-type` est ecrit en toutes lettres. Ce bloc vit
 * avant la regle `.field:first-of-type`, de meme specificite que
 * `.compose .field` : sans cette ligne, le premier champ de chaque cadre
 * garderait sa marge, la ou la mesure a ete prise sans elle.
 */
@media (max-width: 61.999rem) {
  .compose .field,
  .compose .field:first-of-type {
    margin-top: 0.7rem;
  }

  .compose .panel {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  .compose__main {
    row-gap: 0.75rem;
  }
}
```

- [ ] **Étape 3 : vérifier**

```bash
npm run check
npx tsc --noEmit
```

Attendu : vert (les 2 préexistants), `tsc` silencieux.

- [ ] **Étape 4 : commiter**

```
Densifie l'etape Presentation au telephone

Mesure a 375 x 812 : l'etape 3 faisait 4 453 px, soit 5,4 ecrans, pour
cinq cadres et quatorze champs.

Les palettes passent en trois colonnes au telephone — le large en avait
deja quatre — : 401 -> 237 px a 375, sans qu'aucun nom ne deborde.

L'espacement de l'etape se resserre en colonne unique : -72 px a 375,
-152 a 768. Il est limite a .compose pour ne toucher ni l'etape des
cadeaux ni les autres ecrans, et a la colonne unique ou la longueur pose
probleme.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 4 : quatre lignes d'aide

Trois lignes débordaient sur deux à 375 ; deux portaient un « Facultatif. » incohérent — aucun champ
de texte n'est obligatoire. Chaque réécriture a été vérifiée sur une seule ligne dans le navigateur.

**Les sept lignes d'aide qui disent où tombe le texte gardent cette indication.** L'aperçu étant
masqué au téléphone, elles sont la seule indication de position qui reste. Ne touche à aucune autre
ligne d'aide que les quatre ci-dessous.

**Fichiers :**
- Modifier : `components/editor/PageEditor.tsx` — lignes 1190, 1234, 1351, 1487 environ.

- [ ] **Étape 1 : Prénom de la personne** (vers la ligne 1190)

Remplace `help="Facultatif. Affiché tout en haut."` par :

```tsx
                help="Affiché tout en haut."
```

- [ ] **Étape 2 : Texte du bouton** (vers la ligne 1234)

La ligne d'aide y est un ternaire. **Seule la branche `sealEnabled` change** — c'est l'état par défaut.
L'autre branche, `"Sans voile d'ouverture, ce bouton ne s'affiche pas."`, reste telle quelle : elle dit
que le champ devient inerte, ce qui ne se devine pas.

Remplace `? "Le bouton qui lève le voile et découvre les cadeaux."` par :

```tsx
                    ? "Le bouton qui lève le voile."
```

- [ ] **Étape 3 : Signature** (vers la ligne 1351)

Remplace `help="Facultatif. En bas de page, pour dire de qui ça vient."` par :

```tsx
              <Field label="Signature" help="En bas de page, pour dire de qui ça vient.">
```

(la ligne entière, `<Field label="Signature" …>`, tient sur une ligne ; ne change que la valeur de
`help`).

- [ ] **Étape 4 : Effet** (vers la ligne 1487)

Remplace `help="Ce qui tombe sur la page une fois découverte. Une seule fois, pas en boucle."` par :

```tsx
                help="Joué une fois, pas en boucle."
```

Une version plus longue, « Joué une fois sur la page découverte, pas en boucle. », débordait encore sur
deux lignes à 375 : c'est bien la courte qu'il faut.

- [ ] **Étape 5 : le commentaire qui protège les autres lignes**

Dans le bloc `{step === 3 && (`, repère le commentaire existant qui précède la première
`<section className="panel"` du cadre Intro :

```tsx
            {/* Les trois cadres suivent l'ordre des écrans que traverse la
                personne qui reçoit : ce qu'elle voit en arrivant, les cadeaux, puis
                l'écran qui suit son choix. */}
```

**Ne le modifie pas.** Ajoute juste après lui :

```tsx
            {/*
              Les lignes d'aide de ces cadres disent ou tombe chaque texte sur la
              page du receveur. Au telephone l'apercu est masque, et elles sont la
              seule indication de position qui reste : on peut les raccourcir, pas
              les retirer.
            */}
```

- [ ] **Étape 6 : vérifier**

```bash
grep -n "Facultatif" components/editor/PageEditor.tsx
npm run check
npx tsc --noEmit
```

Attendu : le `grep` ne trouve plus que **deux** occurrences, toutes deux dans l'étape des cadeaux, et
toutes deux **à laisser telles quelles** :

- l'aide du champ Note, `"Facultatif. Un mot pour situer le cadeau."`, vers la ligne 1110 — hors du
  périmètre de cette spec ;
- un commentaire de code, vers la ligne 1014, qui explique pourquoi l'intitulé « Lien du produit —
  facultatif » garde ce mot.

S'il en reste une troisième, c'est qu'une des deux lignes d'aide de cette tâche n'a pas été corrigée.
`npm run check` vert, `tsc` silencieux.

- [ ] **Étape 7 : commiter**

```
Ramene trois lignes d'aide a une ligne, et retire deux « Facultatif. »

A 375, les aides de Texte du bouton, Signature et Effet debordaient sur
deux lignes : -54 px une fois raccourcies, chacune verifiee sur une seule.

Prenom et Signature etaient les deux seuls champs marques « Facultatif. »,
alors qu'aucun champ de texte n'est obligatoire — chacun, laisse vide,
prend la formule de l'occasion. Les marquer laissait croire que les autres
l'etaient.

Les sept aides qui disent ou tombe le texte gardent cette indication :
l'apercu etant masque au telephone, elles sont la seule qui reste.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 5 : la phrase fausse du README

**Fichiers :**
- Modifier : `README.md:717`, section « L'aperçu ».

- [ ] **Étape 1 : corriger la phrase**

Ligne 717, remplace :

```markdown
  Colonne collante à partir de 62 rem, bandeau en haut de l'étape en dessous. Il est mis à l'échelle
```

par :

```markdown
  Colonne collante à partir de 62 rem, masqué en dessous. Il est mis à l'échelle
```

Le « bandeau en haut de l'étape » au téléphone n'est jamais rendu : `.compose__side` y est en
`display: none`, et l'aperçu y mesure 0 × 0.

**Ne touche pas au renvoi de la ligne 716**, « voir « L'assistant de composition » » : cette section
existe, ligne 913, et explique précisément pourquoi l'aperçu est masqué. Le README porte des accents,
contrairement aux commentaires de code : garde-les.

- [ ] **Étape 2 : vérifier**

```bash
grep -n "bandeau en haut" README.md
grep -n "^## L'assistant de composition" README.md
npm run check
```

Attendu : le premier `grep` ne trouve plus rien ; le second trouve toujours la section ;
`npm run check` vert.

- [ ] **Étape 3 : commiter**

```
Corrige la description de l'apercu en direct au telephone

Le README decrivait au telephone un « bandeau en haut de l'etape » que le
CSS ne rend jamais : .compose__side y est en display: none depuis le
7 septembre, et l'apercu y mesure 0 x 0.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 6 : tester le garde-fou par mutation

`CLAUDE.md` l'exige, et deux garde-fous ont été décoratifs sur le chantier précédent avant qu'une
mutation ne le montre. **Applique chaque mutation, lance `npm run check`, note la sortie, défais-la
avant la suivante.** Ne les cumule pas. Aucun commit pour cette tâche.

- [ ] **M1 — la règle de base trop basse.** Dans `.stepper__btn`, remplace `min-height: 2.75rem;` par
  `min-height: 2rem;`.
  Attendu : `✗ l'echelle d'etapes reste une cible tactile` avec `min-height de 32 px, minimum 44`.
  Défais.

- [ ] **M2 — la règle de base sans hauteur.** Retire la ligne `min-height: 2.75rem;`.
  Attendu : `… l'echelle d'etapes n'impose plus de min-height en rem`. Défais.

- [ ] **M3 — le contournement par media query.** C'est la mutation qui justifie ce garde-fou. Dans la
  redéfinition `@media (max-width: 30rem) { .stepper__btn { … } }`, ajoute `min-height: 1.75rem;`.
  Attendu : `… min-height de 28 px dans une redefinition de .stepper__btn, minimum 44`. Défais.

**Si une mutation ne produit pas l'échec annoncé, arrête-toi et rapporte-le sans maquiller** : cela
voudrait dire que le garde-fou est décoratif.

- [ ] **Après les trois :**

```bash
git checkout -- app/editor.css
git status --short
npm run check
```

Attendu : `git status` vide, `npm run check` vert.

---

### Tâche 7 : mesurer sur le code réel

Les chiffres de la spec viennent d'une simulation. Ils ne valent qu'une fois relevés sur le code réel.

- [ ] **Étape 1 : ouvrir l'étape 3**

Démarre le serveur de développement dans le volet Browser (`preview_start`, configuration
`mypresentsforyou`), passe la fenêtre en 375 × 812 et navigue vers `/creer`. Un brouillon restauré
peut déposer la page à n'importe quelle étape : le script suivant ne suppose rien.

```js
const attendre = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 40 && !document.querySelector('.stepper__item'); i++) await attendre(250);
const etape = () => [...document.querySelectorAll('.stepper__item')].findIndex(i => i.classList.contains('is-current')) + 1;
const bouton = re => [...document.querySelectorAll('button')].find(x => re.test(x.textContent));
if (etape() === 1) { bouton(/Suivant/).click(); await attendre(700); }
if (etape() === 2) {
  const t = document.querySelector('.row__title input');
  if (t && !t.value) {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(t, 'Collier Fluorite');
    t.dispatchEvent(new Event('input', { bubbles: true }));
    await attendre(300);
  }
  bouton(/Suivant/).click(); await attendre(1000);
}
etape();
```

Attendu : `3`.

- [ ] **Étape 2 : relever à 375**

```js
const g = e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
const pal = document.querySelector('.palettes');
const btns = [...document.querySelectorAll('.stepper__btn')];
JSON.stringify({
  vw: innerWidth,
  docW: document.documentElement.scrollWidth,
  pageH: document.documentElement.scrollHeight,
  palettes: g(pal),
  tuilePalette: g(pal.children[0]),
  nomsQuiDebordent: [...pal.querySelectorAll('span')].filter(s => s.scrollWidth > s.clientWidth + 1).length,
  echelle: btns.map(g),
  rangeesEchelle: new Set(btns.map(b => Math.round(b.getBoundingClientRect().top))).size,
  aidesSurDeuxLignes: [...document.querySelectorAll('.compose .field__help')]
    .filter(a => a.getBoundingClientRect().height > 18)
    .map(a => a.textContent.trim()),
});
```

Attendu :
- `docW === vw === 375` — aucun débordement horizontal ;
- `pageH` autour de **4 168** (avant : 4 453) ;
- `palettes` à environ `[338, 237]` (avant : 401 de haut), tuiles d'environ 95 px de large,
  `nomsQuiDebordent: 0` ;
- `echelle` à 44 px de haut pour les trois boutons, `rangeesEchelle: 1` ;
- `aidesSurDeuxLignes` : vide, ou seulement l'aide de l'ouverture désactivée si elle est affichée.

- [ ] **Étape 3 : relever à 768 et à 1440**

Passe la fenêtre en 768 × 1024, relance le script de l'étape 2. Attendu : `pageH` autour de **3 565**
(avant : 3 714 — le resserrement y rapporte 152 px, l'échelle en coûte 3), `docW` au plus égal à `vw`.

Puis en 1440 × 900. Attendu : l'échelle à 44 px, et rien d'autre qui bouge — l'espacement est limité
à la colonne unique, et les palettes y étaient déjà en quatre colonnes.

Remets la fenêtre en `desktop` quand tu as fini.

- [ ] **Étape 4 : consigner, dans la spec et dans le README**

Si un chiffre s'écarte nettement de l'attendu, **ne corrige pas le chiffre** : comprends l'écart
d'abord, et rapporte-le.

Sinon, deux endroits reçoivent les valeurs **relevées**, et non celles de la simulation :

1. Le tableau « Mesure attendue » de la spec
   `docs/superpowers/specs/2026-09-10-etape-presentation-densite-design.md` — donne-les pour ce
   qu'elles sont, mesurées.

2. Le README, section « L'assistant de composition » : ajoute, **juste après** le paragraphe qui
   commence par `**L'aperçu en direct n'existe qu'au-delà de 62 rem.**` et se termine par
   `l'hydratation.`, le paragraphe suivant — en remplaçant chaque chiffre par celui que tu as relevé
   s'il diffère :

```markdown
**La présentation se densifie au téléphone, sans rien cacher.** Elle faisait 4 453 px à 375 — cinq
écrans et demi pour quatorze champs, dont 1 365 px de grilles de tuiles. Les palettes passent en
trois colonnes sous 34 rem (401 → 237 px) ; trois lignes d'aide qui débordaient sur deux reviennent
à une ; l'espacement se resserre en colonne unique, de 72 px à 375 et de 152 à 768. Replier les
grilles aurait rapporté davantage, mais caché des réglages — dont la police et l'ouverture, que
l'occasion ne choisit pas. Les lignes d'aide qui disent où tombe chaque texte restent : l'aperçu,
masqué, ne le montre plus. L'échelle d'étapes passe au passage de 39 à **44 px**, la taille d'une
cible tactile, à toutes les largeurs.
```

Puis :

```bash
npm run check
```

Attendu : vert. Commite :

```
Consigne les mesures relevees, dans la spec et le README

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 8 : les trois portes, et la livraison

- [ ] **Étape 1 : arrêter le serveur, puis construire**

Arrête le serveur de développement (`preview_stop`) **avant** de construire — voir « Ce qu'il faut
savoir ».

```bash
npm run check
npx tsc --noEmit
npm run build
```

Attendu : `npm run check` vert, `tsc` silencieux, build réussi.

- [ ] **Étape 2 : pousser**

```bash
git push -u origin claude/etape-presentation-densite
```

- [ ] **Étape 3 : la pull request**

`gh` n'est pas installé sur cette machine. Écris le corps de la PR dans le scratchpad et donne-le à
l'utilisateur avec le lien de comparaison. **La base de la PR est `claude/etape-cadeaux-lisibilite`**
tant que les quatre correctifs de cette branche ne sont pas fusionnés dans `main` ; sinon la PR
montrerait aussi leurs commits. Le corps décrit le défaut, la cause, la correction et **les mesures
relevées à la tâche 7**, et se termine par :

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
