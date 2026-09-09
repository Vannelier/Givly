# Travailler sur Givly

Ce fichier s'adresse à un agent. Le `README.md` explique **ce que fait** le produit et **pourquoi**
chaque décision a été prise ; celui-ci dit **comment travailler** dessus. Les deux se lisent, mais
c'est le README qui fait foi sur le produit.

## En une phrase

Givly renverse la liste de souhaits : **c'est le donneur qui propose deux à dix idées, et le
receveur qui choisit**. Tout le reste — la mise en scène, le voile, les décors, la carte à imprimer
— sert ce renversement. Une proposition qui l'affaiblit est probablement une mauvaise proposition,
même si elle est bien faite.

## Les commandes qui comptent

| commande | à lancer |
|---|---|
| `npm run check` | **avant chaque commit** — 157 vérifications, sans base de données |
| `npx tsc --noEmit` | avant chaque commit |
| `npm run build` | avant chaque commit |
| `npm run dev` | développement |

`npm run check` est un harnais maison (`scripts/check.ts`), pas Jest. Il tourne en une seconde et
n'a besoin de rien. Il n'y a pas d'autre suite de tests.

## Mesurer, ne pas deviner

C'est la règle la plus importante de ce dépôt, et celle qui a rattrapé le plus d'erreurs.

Presque tous les défauts corrigés ici étaient **invisibles à la relecture du CSS** et se sont
révélés en mesurant dans un vrai navigateur :

- une feuille réduite par `transform` gonflait la largeur du document à 1 122 px sans qu'aucun
  élément ne « dépasse » au `getBoundingClientRect` ;
- un effet ancré au document partait hors champ — 0 particule visible sur 26, ce qu'aucune lecture
  du fichier n'aurait dit ;
- une animation de sélection coûtait 11 peintures par clic, dont 4 imputables à une seule
  transition que rien ne désignait ;
- deux colonnes de grille s'étaient inversées, la carte héritant de la colonne des réglages.

Le protocole : lancer `npm run build && npx next start`, piloter un Chromium headless par CDP
(`/opt/pw-browsers/chromium-1194/chrome-linux/chrome --headless=new --remote-debugging-port=…`),
lire les géométries et les traces, **puis** conclure. Les sondes vivent dans le scratchpad, jamais
dans le dépôt — et `npm run check` refuse d'ailleurs toute page dont le slug n'est pas réservé, ce
qui attrape une page de sonde oubliée.

Pièges déjà rencontrés dans ce conteneur : Chromium headless impose une largeur minimale de 500 px ;
`--virtual-time-budget` fausse l'horloge et rend toute mesure de temps caduque ; le FPS y est de 60
quoi qu'on fasse, donc **ne pas chercher à mesurer des images par seconde** — compter les peintures
et les recalculs de style.

## Conventions

**Le code parle français.** Noms de variables, de fonctions et de classes CSS compris. Les
identifiants stockés en base sont en français sans accent (`bougies`, `poussiere`).

**Les commentaires disent pourquoi, jamais quoi.** Le style du dépôt est celui d'un carnet : on y
explique le défaut qu'on a rencontré, la mesure qui l'a montré, et pourquoi la solution retenue est
celle-là. Un commentaire qui paraphrase la ligne suivante n'a pas sa place. Les commentaires de code
sont **sans accents** (le reste — README, textes d'interface — en porte).

**Rien n'est stocké en base que des identifiants.** `theme.palette.id`, `theme.occasion`,
`theme.font`, `theme.opening`, `theme.effect`. Les couleurs, les décors et les mots vivent dans
`lib/palettes.ts` et `lib/occasions.ts` : retoucher un thème met à jour toutes les pages déjà
créées, et un identifiant inconnu retombe sur le défaut. Ajouter une valeur ne demande donc **pas**
de migration.

**Un garde-fou par piège structurel.** Quand une correction porte sur quelque chose qu'un futur
remaniement pourrait défaire sans qu'on le voie, elle s'accompagne d'une vérification dans
`scripts/check.ts` — y compris sur le CSS et sur le JSX, lus comme du texte. **Toute nouvelle
vérification se teste par mutation** : casser exprès ce qu'elle protège, constater qu'elle échoue,
remettre. Sans cette étape on écrit des vérifications décoratives, et c'est arrivé — une assertion
sur `.fx--notes span` passait alors que la règle avait été renommée, parce que
`.fx--notes span:nth-child(odd)` la satisfaisait.

## Ce qui se casse facilement

- **Hydratation.** Pas de `Math.random()` au rendu (les particules et les décors tirent d'une suite
  déterministe), pas de `localStorage` dans un initialiseur de `useState`, pas de lecture de la
  largeur de fenêtre pendant le rendu. Le masquage responsive est en CSS, jamais en JavaScript.
- **`<pattern>` et les identifiants SVG.** Ils sont dérivés du décor et de sa tuile ; deux instances
  du même décor à la même échelle les partagent, et dans un document le premier `id` gagne. Sans
  conséquence aujourd'hui — aucun écran n'affiche deux palettes à la fois — mais une page qui le
  ferait verrait le second décor prendre la couleur du premier.
- **`position: sticky` en grille.** Le bloc englobant d'un élément collant est sa zone de grille, et
  une zone de grille ne dépasse pas sa rangée. En colonne unique il faut du `flex`.
- **Les pseudo-éléments et l'ordre de peinture.** `box-shadow: inset` se peint **sous** le contenu ;
  un `::before` sans `z-index` passe derrière tout contenu positionné. Deux défauts visibles s'y
  sont logés (l'anneau de sélection, l'aplat du bandeau).
- **`prefers-reduced-motion`.** Le décor est retiré, pas ralenti.

## Git et livraison

Développer sur la branche indiquée par la tâche, commiter, pousser, ouvrir une **pull request en
brouillon**. Un message de commit décrit le défaut, la cause, la correction et la mesure — pas la
liste des fichiers touchés.

## Ce qui n'est pas décidé

Le **modèle économique**. Voir la section du README : rien n'est implémenté, et la réflexion sur
l'affiliation s'est arrêtée sur trois réserves — le volume (≈ 1,40 € par page), une zone grise
juridique sur la récriture des liens, et un cookie de 24 h contre un parcours asynchrone. Ne rien
construire là-dessus sans avoir instrumenté trois chiffres : pages créées, choix confirmés, clics
vers la boutique.
