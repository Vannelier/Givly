# L'étape des cadeaux — deux zones au lieu de six champs

**Date** : 2026-09-10
**État** : validé, prêt pour le plan d'implémentation

## Le problème

L'étape 2 de l'éditeur aligne six contrôles de même poids par cadeau. Trois
défauts, tous mesurés dans un navigateur réel plutôt que lus dans le CSS.

**Rien ne dit ce qui remplit quoi.** « Adresse de la page produit » est le seul
champ qui en remplit deux autres — coller un lien et cliquer « Récupérer » écrit
le titre et l'image. Mais il est présenté exactement comme eux : même étiquette,
même bordure, même colonne. Le donneur qui propose un cadeau non achetable en
ligne — un week-end, un dîner, un objet d'occasion — ne sait pas s'il a le droit
de sauter ce champ, et celui qui colle un lien ne sait pas ce qui va se passer.

**La ligne est trop haute au téléphone.** Mesuré à 375 × 812 : **651 px pour un
cadeau vide**, soit 80 % de la fenêtre, et 1 519 px pour l'étape entière avec une
seule ligne. Dix cadeaux font 6 510 px. L'essentiel vient de la vignette, qui
occupe une bande pleine largeur au-dessus des champs.

**La ligne est creuse sur écran large.** Mesuré à 1440 : la ligne fait **481 px**,
la vignette occupe 136 × 102 dans une colonne haute de 481 — **≈ 350 px de
colonne vide** sous elle — et les champs Titre et Note sont étirés à **632 px**
pour des textes de 80 et 200 caractères.

À quoi s'ajoute une redondance : il y a **trois façons de poser une image** (le
cadre de collage, le champ d'adresse, le bouton « Téléverser »), présentées comme
trois choses distinctes alors qu'elles écrivent toutes `image_url`.

Le tout doit être réglé maintenant plutôt qu'après : les suggestions de cadeaux
ajouteront une **troisième origine** à une ligne qui en gère déjà mal deux.

## Ce qu'on construit

La ligne de cadeau passe de six contrôles à plat à **deux zones nommées**, dans
l'ordre de la question qu'on se pose : *d'où vient ce cadeau*, puis *qu'est-ce
qu'on en montre*.

Ci-dessous, l'enroulement sous 40 rem — au-delà, Note rejoint Titre sur la
rangée de la vignette (voir « Géométrie ») :

```
┌ 1 ───────────────────────────────────── ↑ ↓ × ┐
│ ╭─ row__source ─────────────────────────────╮ │
│ │ Partir d'un lien produit — remplit le      │ │
│ │ titre et l'image, et te revient après le   │ │
│ │ choix pour acheter                         │ │
│ │ [https://…                    ] [Récupérer]│ │
│ │ « Titre et image récupérés. »              │ │
│ ╰────────────────────────────────────────────╯ │
│ ─── Ce que verra la personne ───────────────── │
│ ╭─ row__gift ───────────────────────────────╮ │
│ │ [vignette]  Titre                          │ │
│ │             Note                           │ │
│ ╰────────────────────────────────────────────╯ │
└────────────────────────────────────────────────┘
```

### Pourquoi le lien reste visible, et ce que dit son intitulé

`source_url` n'est pas un outil jetable. Il est **stocké**, et
`AdminView.tsx:115` le ressert au donneur après le choix sous « Ouvrir la page
d'origine ↗ ». C'est le lien d'achat — exactement la contrainte que le README
identifie pour un parcours asynchrone : *le lien d'achat final doit être servi
par MyPresentsForYou depuis l'écran d'administration*.

L'intitulé de la zone énonce donc les **deux** rôles au lieu de nier le second.
L'ancien texte, « Facultatif. Jamais affichée sur la page-cadeau. », disait ce
que le champ ne fait pas ; le nouveau dit ce qu'il fait.

Le message de résultat de l'extraction (`row.hint`) **déménage dans cette zone**.
Il rend compte du geste « Récupérer » ; il n'a rien à faire sous la note, à
l'autre bout de la ligne.

### Un seul contrôle d'image

La vignette absorbe les trois. Elle devient un `<label>` portant l'`<input
type="file">` masqué :

- **cliquer** ouvre le sélecteur — la galerie ou l'appareil photo au téléphone ;
- **coller** y marche déjà : le gestionnaire vit sur la ligne entière et ne
  s'efface que sur les champs de saisie. Retirer le champ d'adresse **élargit**
  donc la surface de collage au lieu de la réduire ;
- une **croix** apparaît sur la vignette dès qu'une image est posée, pour
  l'effacer.

Le champ « Adresse de l'image » disparaît. Ce qu'on perd : taper une adresse
d'image à la main. Ce qu'on garde : l'extraction, le collage d'une adresse
d'image, le collage d'un fichier, le téléversement — c'est-à-dire tous les
chemins réellement empruntés.

**L'input n'est pas `hidden`, et c'est le point qui décide.** Mesuré dans le
navigateur : `<input type="file" hidden>` est `display: none`, donc non
focalisable — `focus()` dessus laisse le focus sur `body`. Le bouton
« Téléverser » d'aujourd'hui est déjà inatteignable au clavier ; ça ne se voit
pas parce que deux autres chemins subsistent, le champ d'adresse et la vignette
qui porte `tabIndex={0}`. Les supprimer tous les deux **en gardant `hidden`**
rendrait l'image totalement inatteignable au clavier.

L'input est donc **masqué en CSS mais focalisable** — position absolue, 1 px,
`opacity: 0` — et `.row__thumb:focus-within` porte l'anneau de focus. Le clavier
y gagne un chemin qu'il n'avait pas.

## Géométrie

Un seul seuil, **40 rem**, celui qui existe déjà dans `editor.css`. On n'en
ajoute pas.

| | `row__source` | `row__gift` |
|---|---|---|
| **< 40 rem** | pleine largeur | vignette + Titre sur une rangée, Note dessous |
| **≥ 40 rem** | pleine largeur | vignette + Titre + Note sur une rangée |

La zone source reste pleine largeur partout : une URL est longue, elle est le
seul élément de la ligne qui profite vraiment des 811 px.

La vignette passe à **5,5 rem** de côté au téléphone, **7,5 rem** au-delà. C'est
là qu'est l'essentiel du gain de hauteur : elle cesse d'être une bande pleine
largeur pour devenir une case dans une rangée.

Les `grid-template-areas` actuelles **disparaissent**. Elles existaient pour
faire remonter l'adresse produit au-dessus de la vignette au téléphone sans
toucher au DOM ; avec deux conteneurs réels, l'ordre du DOM **est** l'ordre de
lecture, à toutes les largeurs. Le commentaire qui explique l'astuce part avec
elle.

### Ce que ça donne

| | ligne vide, aujourd'hui | ligne vide, après | dix cadeaux, après |
|---|---|---|---|
| **375 px** | 651 px | ≈ 310 px | 6 510 → ≈ 3 100 px |
| **1440 px** | 481 px | ≈ 330 px | 4 810 → ≈ 3 300 px |

Sur écran large, deux gains que le téléphone ne donnait pas : la colonne morte de
350 px disparaît, et Titre et Note tombent de 632 à ≈ 310 px — une longueur de
ligne tenable pour 80 et 200 caractères.

**Le prix, arbitré et accepté** : entre 40 et 55 rem, les trois colonnes serrent
Titre et Note autour de 200 px. Étroit sans être cassé, sur une plage de largeurs
peu fréquente. Le seuil unique vaut mieux qu'un second seuil à maintenir.

## Cohérence entre les largeurs

Le principe n'est pas de calquer le téléphone sur le large, ni l'inverse. Le DOM
est **identique** partout — en-tête, zone source, filet, zone cadeau — et l'ordre
de lecture aussi. Une seule chose varie avec la largeur : la façon dont la zone
cadeau s'enroule. Les mêmes intitulés, les mêmes contrôles, la même frontière,
dépliés différemment.

## La place des suggestions

`row__source` est la zone « par où commencer ». Un second point d'entrée — piocher
dans des idées proposées — s'y ajoutera comme un frère du champ de lien, sans
redécouper la ligne ni déplacer la zone cadeau.

**Rien n'apparaît à l'écran aujourd'hui.** Pas de bouton grisé, pas de mention
« bientôt » : on ne montre pas au donneur une porte qui ne s'ouvre pas.

## Ce qui ne change pas

Aucun champ en base, aucun identifiant, aucune route, aucune validation.
`image_url` reste écrit par l'extraction, le collage et le téléversement — seule
la saisie manuelle d'une adresse d'image disparaît. `source_url` garde son rôle
et son usage dans l'administration.

**Pas de repli, pas d'accordéon.** Une ligne remplie reste entièrement lisible et
modifiable sans un geste de plus. Le gain de hauteur vient de la disposition, pas
d'un masquage.

L'en-tête de ligne — numéro, ↑, ↓, × — est inchangé.

## Garde-fous

Trois vérifications dans `scripts/check.ts`, chacune sur un piège qu'un
remaniement futur défairait sans qu'on le voie. **Les trois se testent par
mutation** : casser exprès ce qu'elles protègent, constater l'échec, remettre.

**La vignette est une cible tactile.** Elle est désormais le *seul* chemin vers
le sélecteur de fichier ; sous 44 px de côté elle devient inatteignable au pouce
(WCAG 2.5.8). La règle `.row__thumb` doit imposer une dimension minimale ≥ 44 px.
Lu comme du texte : le harnais tourne sans navigateur.

**L'ordre de lecture est l'ordre du DOM.** `row__source` doit précéder
`row__gift` dans `PageEditor.tsx`. C'est tout ce qui reste pour tenir la
hiérarchie une fois les `grid-template-areas` retirées, et c'est exactement le
genre de chose qu'un remaniement inverse en silence.

**L'input de fichier reste focalisable.** `hidden` sur cet `<input>` est le
raccourci naturel — c'est ce que fait le code d'aujourd'hui, et le passage de
trois chemins à un seul le transforme d'inélégance en coupure. Le garde-fou
refuse l'attribut `hidden` sur l'input de la vignette et exige la règle de
masquage clippée.

## Accessibilité

Les `aria-label` par ligne (« Titre du cadeau 3 ») sont conservés : ils sont ce
qui rend la liste navigable au lecteur d'écran, où l'intitulé visuel seul serait
ambigu entre dix cadeaux.

La vignette-`<label>` devient atteignable au clavier par son `<input
type="file">` masqué mais focalisable — voir « Un seul contrôle d'image » : c'est
un gain sur l'existant, pas un maintien. Elle garde le comportement de collage.
L'intitulé du filet, « Ce que verra la personne », est un vrai élément de texte,
pas une bordure décorée.
