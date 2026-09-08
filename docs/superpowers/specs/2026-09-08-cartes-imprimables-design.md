# Cartes imprimables — dix modèles au carrousel

**Date** : 2026-09-08
**État** : validé, prêt pour le plan d'implémentation

## Le problème

`/admin/[token]/imprimer` ne propose qu'une carte : un A6 centré, habillé par la
palette et le décor de la page. Deux défauts.

**Le format ne tient pas ses promesses.** Le bandeau annonce « imprime, plie en
deux », mais la feuille de style force `@page { size: A6 }` et la carte fait
exactement 105 × 148 mm — il n'y a rien à plier, et une imprimante domestique
chargée en A4 la calera dans un coin ou la mettra à l'échelle.

**Il n'y a rien à choisir.** Le décor suit l'occasion de la page : une carte
« sans occasion » sort donc nue, avec beaucoup de vide en haut et en bas.

## Ce qu'on construit

Un carrousel de **dix modèles** sur la page d'impression, parcouru à la flèche
gauche et à la flèche droite. Chaque modèle combine une composition et un décor.

Le format devient **A4 paysage, une seule face, plié en deux** → carte A5
portrait. C'est le pliage de la carte de vœux classique : aucun réglage
d'imprimante, aucun découpage, et l'intérieur reste vierge pour un mot écrit à
la main.

## Géométrie

Feuille A4 paysage, 297 × 210 mm, `@page { size: A4 landscape; margin: 0 }`.
Deux panneaux de 148,5 × 210 mm séparés par un pli vertical central.

| panneau | contenu |
|---|---|
| **droit** | la couverture : « Pour X », le mot d'ouverture, le titre, le décor |
| **gauche** | le dos : le QR code, « Scanne pour ouvrir ta carte », la signature |

**Sens du pli** : on rabat le panneau gauche *derrière* le droit. Le pli tombe
alors à gauche, la couverture est devant, le dos apparaît en retournant la
carte, et l'intérieur — non imprimé — s'ouvre comme un livre.

Un repère de pli discret marque le centre : deux traits courts sur les bords
haut et bas, pas une ligne pointillée traversant la carte, qui resterait visible
sur le produit fini.

## Les dix modèles

Une liste **plate** : chaque entrée est une combinaison déjà arbitrée, pas deux
sélecteurs à croiser. Une seule paire de flèches, et un carrousel assez court
pour être parcouru en entier.

| # | id | composition | décor | nom affiché |
|---|---|---|---|---|
| 1 | `classique` | `centre` | `none` | Classique |
| 2 | `classique-coeurs` | `centre` | `coeurs` | Cœurs |
| 3 | `cadre-flocons` | `cadre` | `flocons` | Flocons |
| 4 | `cadre-etoiles` | `cadre` | `etoiles` | Étoiles |
| 5 | `cadre-feuilles` | `cadre` | `feuilles` | Feuilles |
| 6 | `bandeau` | `bandeau` | `none` | Bandeau |
| 7 | `bandeau-confetti` | `bandeau` | `confetti` | Confettis |
| 8 | `bandeau-guirlande` | `bandeau` | `guirlande` | Guirlande |
| 9 | `affiche` | `affiche` | `none` | Affiche |
| 10 | `affiche-coeurs` | `affiche` | `coeurs` | Affiche fleurie |

Les décors sont ceux de `MotifKind` (`lib/occasions.ts`), déjà dessinés en SVG :
aucun nouveau graphisme à produire.

Le premier modèle est le défaut. La palette et la police restent celles du thème
de la carte — le carrousel ne touche qu'à la composition et au décor.

### Les quatre compositions

**`centre`** — l'actuelle, portée sur deux panneaux. Couverture : bloc centré
verticalement, « Pour X » puis le mot d'ouverture en petites capitales espacées,
puis le titre. Dos : QR de taille moyenne centré, légende dessous, signature en
bas de panneau.

**`cadre`** — un filet intérieur à 8 mm du bord encadre chaque panneau. Le décor
est semé légèrement à l'intérieur du cadre. Typographie plus petite, tout
centré. Le filet se retrouve identique au dos, autour du QR.

**`bandeau`** — un aplat de la couleur d'accent occupe le tiers supérieur de la
couverture et porte le mot d'ouverture en réserve ; le titre vient dessous, sur
le papier. Dos : QR aligné en haut, légende et signature en bas.

**`affiche`** — le titre en très grand, aligné à gauche, occupant l'essentiel de
la couverture ; le mot d'ouverture en discret au-dessus. Dos : QR pleine
largeur, le plus grand des quatre, légende centrée dessous.

## Architecture

Quatre pièces, chacune avec un rôle net.

**`lib/printModels.ts`** — la liste en données pures et son type. Expose
`PRINT_MODELS`, `DEFAULT_PRINT_MODEL_ID`, et `printModelById(id)` qui retombe
sur le défaut pour un identifiant inconnu, comme `occasionById` et `paletteIdOf`.
Aucun import Node : ce module part dans le bundle navigateur.

**`components/PrintableCard.tsx`** — la coquille. Tient la feuille, les deux
panneaux, le repère de pli et la génération du QR. Ne connaît des modèles que
deux choses : la classe `carte--<composition>` qu'elle pose, et le décor qu'elle
transmet à `GiftMotif`.

**`components/PrintCarousel.tsx`** — les flèches, le nom du modèle, le compteur
« 3 / 10 » et la navigation clavier. Séparé parce que ça ne dessine pas la carte
et que ça disparaît à l'impression.

**`app/print.css`** — la mécanique d'impression partagée, puis un bloc par
composition. Sorti de `app/editor.css`, qui n'a pas à porter les règles
d'impression d'une page qui n'est pas le formulaire.

### Ce qui bouge dans l'existant

- `app/editor.css` : les blocs `.print-page`, `.print-bar`, `.card-print*` et le
  `@media print` partent vers `app/print.css`.
- `app/layout.tsx` : importe `./print.css`.
- `app/admin/[token]/imprimer/page.tsx` : inchangé dans ses props.
- Le texte du bandeau passe de « Format A6 » à l'instruction de pliage.

## Le carrousel

Deux boutons flèche encadrant le nom du modèle et le compteur, dans la barre du
haut. Les flèches du clavier ← et → font la même chose. La navigation boucle :
après le dixième vient le premier.

Le compteur porte `aria-live="polite"` pour que le changement soit annoncé, et
chaque flèche un `aria-label` explicite — « Modèle précédent », « Modèle
suivant ».

**Rien n'est enregistré.** Le choix vit dans l'état de la page. Réimprimer plus
tard veut dire re-choisir. C'est délibéré : persister demanderait une colonne,
une migration et une règle de validation, pour un geste qu'on fait une fois.

## Le QR code

`errorCorrectionLevel` passe de `M` à `Q` : sur papier, le code sera plié,
manipulé, parfois imprimé à court d'encre. Q tolère 25 % de dégradation contre
15 %.

Il est posé sur une plage blanche avec au moins quatre modules de zone de
silence — c'est ce qu'exige la norme, et la vignette ne peut pas se permettre
d'être posée directement sur un aplat de couleur ou un décor.

`print-color-adjust: exact` reste : sans lui, le navigateur supprime les aplats
à l'impression. La composition `bandeau` consomme donc franchement de l'encre —
c'est assumé, elle est là pour ceux qui veulent une carte qui claque.

## Le payant, plus tard

Rien n'est construit pour ça maintenant. La liste étant des données indexées par
identifiant, ajouter un champ `plan: "free" | "paid"` le jour venu ne touchera ni
la coquille ni le CSS. La colonne `plan` existe déjà en base.

## Vérifications

`scripts/check.ts` est synchrone et sans DOM. Il couvrira ce qui est vérifiable
sans navigateur :

- les identifiants de modèle sont uniques ;
- chaque nom affiché est non vide ;
- chaque décor référencé existe dans `MotifKind` ;
- chaque composition référencée est l'une des quatre connues ;
- les quatre compositions apparaissent chacune au moins une fois ;
- `printModelById` retombe sur le défaut pour un identifiant inconnu, vide, ou
  d'un autre type.

**Ce qui ne peut pas être vérifié automatiquement** : le rendu papier, le sens
du pli, le comportement des marges d'imprimante, la lisibilité du QR une fois
imprimé. La géométrie et l'aperçu avant impression du navigateur peuvent être
contrôlés ; le premier tirage réel revient à l'auteur du projet. C'est la limite
à connaître avant de considérer la fonctionnalité comme finie.

## Hors périmètre

- Le paywall lui-même.
- La persistance du modèle choisi.
- L'impression recto-verso, écartée : une feuille gâchée parce que
  l'orientation était mauvaise coûte plus que le charme d'un QR caché à
  l'intérieur.
- D'autres formats (A6 direct, planche de cartes à découper).
- De nouveaux décors : les six existants suffisent.
