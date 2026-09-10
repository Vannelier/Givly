# L'étape Présentation — densifier sans rien cacher

**Date** : 2026-09-10
**État** : validé, prêt pour le plan d'implémentation

## Le problème

Au téléphone, l'étape 3 de l'éditeur est la plus longue de tout le parcours. Mesuré à 375 × 812 :
**4 453 px de page défilable**, soit 5,4 écrans, pour cinq cadres et quatorze champs. À titre de
comparaison, l'étape des cadeaux fait 1 703 px et celle de l'occasion 1 545.

Où partent les 4 453 px :

| cadre | hauteur | dont |
|---|---|---|
| Le thème | 1 406 px | palettes 401, effets 500, polices 212, disposition 66 |
| Intro | 1 055 px | quatre champs de texte, et le repli d'ouverture — actif par défaut — avec ses six tuiles (252) |
| Cadeaux | 595 px | trois champs de texte, un repli |
| Choix | 358 px | un champ, un repli |
| Le lien | 280 px | un champ, un repli |

Les grilles de tuiles — palettes, effets, ouvertures, polices — pèsent à elles seules **1 365 px**,
près d'un tiers de la page. Les champs de texte pèsent 91 à 120 px chacun, dont une ligne d'aide.

Le défaut à corriger est **la longueur**. L'aperçu vivant, masqué sous 62 rem, n'est pas en cause :
voir « Ce qui a été écarté ».

## Ce qui a été écarté, et pourquoi

Plusieurs pistes ont été mesurées avant d'être abandonnées. Elles sont consignées ici pour qu'on ne
les reprenne pas sans savoir ce qu'elles coûtent.

**Réintroduire l'aperçu au téléphone.** Il a été retiré le 7 septembre (commit `e998621`) : son cadre
de 300 × 525 ne montrait qu'une tranche de la page, coupée en haut et en bas, et repoussait le
formulaire sous la ligne de flottaison. Le défaut ressenti est la longueur, pas l'absence de retour ;
le bouton « Aperçu » ouvre le même rendu en plein écran.

**Replier palette et effet sur leur choix courant.** −754 px mesurés, et défendable — l'occasion a
déjà posé ces deux réglages à l'étape 1. Écarté pour garder tout visible et n'ajouter aucune
interaction.

**Replier les quatre grilles.** −1 011 px, mais la police et l'ouverture seraient cachées avant
d'avoir été vues, avec une valeur par défaut que personne n'a choisie : l'occasion n'y touche pas.

**Passer les effets en trois colonnes.** −22 px seulement : chaque tuile porte une explication qui se
replie alors sur deux lignes, et la tuile passe de 94 à 107 px. La densité n'est pas le levier pour
les effets.

**Mettre une case à cocher devant les champs de texte facultatifs.** Déjà essayé et rejeté — le README
le consigne : « une case à cocher devant un champ facultatif ne protégeait de rien et ajoutait un
geste ».

**Alléger toutes les lignes d'aide.** Sept des neuf disent **où tombe le texte** sur la page du
receveur — « tout en haut », « au-dessus du titre », « au-dessus des cadeaux », « la ligne sous ce
titre », « en bas de page », « à la place des cadeaux ». L'aperçu étant masqué au téléphone, ce sont les seules indications de position qui
restent. Les retirer rendrait le réglage plus aveugle qu'aujourd'hui.

## Ce qu'on construit

Tout reste visible. Aucune interaction nouvelle. Cinq changements, chacun mesuré à 375 × 812 sur la
page réelle, par simulation dans le navigateur :

| changement | mesuré |
|---|---|
| Palettes en trois colonnes au téléphone | −164 px |
| Trois lignes d'aide ramenées à une ligne | −54 px |
| « Facultatif. » retiré de deux lignes d'aide | 0 px |
| Espacement de l'étape resserré sous 62 rem | −72 px |
| Échelle d'étapes portée à la taille d'une cible tactile | +5 px |
| **Total** | **≈ −285 px** |

**4 453 → ≈ 4 168 px**, soit 5,1 écrans au lieu de 5,4.

### Palettes en trois colonnes

Aujourd'hui `.palettes` est en deux colonnes, et passe à quatre au-delà de 34 rem. Le téléphone est
donc l'exception, pas le large : il passe à **trois colonnes** sous 34 rem.

Mesuré : les tuiles font 95 px de large, **aucun nom de palette ne déborde**, et la grille passe de
401 à 237 px. Quatre colonnes au téléphone donneraient des tuiles d'environ 70 px, trop étroites pour
le nuancier et le nom.

### Trois lignes d'aide ramenées à une ligne

Chacune occupait deux lignes à 375 px ; chaque réécriture a été vérifiée sur une seule, dans le
navigateur.

| champ | aujourd'hui | après |
|---|---|---|
| Texte du bouton | « Le bouton qui lève le voile et découvre les cadeaux. » | « Le bouton qui lève le voile. » |
| Signature | « Facultatif. En bas de page, pour dire de qui ça vient. » | « En bas de page, pour dire de qui ça vient. » |
| Effet | « Ce qui tombe sur la page une fois découverte. Une seule fois, pas en boucle. » | « Joué une fois, pas en boucle. » |

Pour « Texte du bouton », seule la branche affichée **quand l'ouverture est active** change — c'est
l'état par défaut. L'autre branche, « Sans voile d'ouverture, ce bouton ne s'affiche pas. », reste
telle quelle : elle dit que le champ devient inerte, ce qui ne se devine pas.

Pour « Effet », une version plus longue — « Joué une fois sur la page découverte, pas en boucle. » —
débordait encore sur deux lignes ; c'est la courte qui a été retenue.

### « Facultatif. » retiré

Deux champs seulement le disaient : Prénom et Signature. Or le README pose qu'**aucun champ de texte
n'est obligatoire** — chacun, laissé vide, prend la formule de l'occasion. Marquer deux champs
facultatifs laisse croire que les autres ne le sont pas.

| champ | aujourd'hui | après |
|---|---|---|
| Prénom de la personne | « Facultatif. Affiché tout en haut. » | « Affiché tout en haut. » |
| Signature | voir ci-dessus | voir ci-dessus |

### Espacement resserré sous 62 rem

Limité à `.compose`, pour ne toucher ni l'étape 2 — réglée à 408 px par ligne au chantier précédent —
ni les autres écrans qui partagent `.field` et `.panel`. L'administration, qui embarque le même
éditeur, en profitera à son étape 3, ce qui est voulu.

Limité aussi à la colonne unique, **sous 62 rem** : c'est là que la longueur pose problème. Au-delà,
l'étape passe en deux colonnes avec l'aperçu collant ; mesuré à 1440, la règle n'y a aucun effet,
comme voulu.

| règle | aujourd'hui | sous 62 rem |
|---|---|---|
| `.compose .field` — marge haute | 1 rem (0,75 pour le premier) | 0,7 rem |
| `.compose .panel` — rembourrage vertical | `clamp(1.1rem, 4vw, 1.6rem)` : 1,1 rem à 375, 1,6 rem dès 640 px | 1 rem |
| `.compose__main` — écart entre cadres | 1 rem | 0,75 rem |

Mesuré avec ces règles exactes, sans `!important` : **−72 px à 375**, et **−152 px à 768** — la
tablette gagne deux fois plus, parce que le rembourrage des cadres y valait déjà 1,6 rem. Une première
simulation, qui forçait les valeurs, donnait 70 à 375 : elle écrasait aussi `.field:first-of-type`,
que les vraies règles ne touchent qu'à égalité de spécificité.

### Échelle d'étapes à 44 px

Les trois boutons de l'échelle — Occasion, Cadeaux, Présentation — font **39 px de haut à 375, et
41 px à 768 comme à 1440** : sous les 44 px d'une cible tactile (WCAG 2.5.8) à toutes les largeurs.
C'est la navigation entre étapes, au bord haut de l'écran.

`.stepper__btn` reçoit `min-height: 2.75rem`. Mesuré aux trois largeurs : les boutons passent à
44 px, restent sur une seule rangée, sans débordement horizontal — 5 px de plus sur la page à 375,
3 à 1440.

Ce changement dépasse l'étape 3 — l'échelle est commune aux trois étapes. Il a été validé avec le
reste.

## Ce qui ne change pas

- **L'aperçu reste masqué sous 62 rem.** La décision du 7 septembre tient.
- **Tous les champs de texte restent visibles.** Aucun repli nouveau.
- **Les sept lignes d'aide qui disent où tombe le texte gardent cette indication.** Cinq restent mot
  pour mot ; Prénom et Signature ne perdent que « Facultatif. ».
- **Police, ouverture et effet gardent leur grille actuelle.** Seule celle des palettes change.
- Aucun champ en base, aucun identifiant, aucune route, aucune validation. Pas de migration.

## Garde-fou

**L'échelle d'étapes reste une cible tactile.** Dans `scripts/check.ts`, un test exige que la règle
`.stepper__btn` impose `min-height` en `rem` d'au moins 44 px.

Il lit **toutes** les redéfinitions de `.stepper__btn`, pas la seule règle de base. C'est la leçon du
garde-fou de la vignette au chantier précédent : il ne lisait que la règle de base, et une media query
le contournait sans bruit. Or `.stepper__btn` est **déjà** redéfinie dans une media query téléphone
(son rembourrage) : c'est exactement là qu'un ajustement futur ramènerait la hauteur sous 44 px.

Il se teste par mutation, comme l'exige `CLAUDE.md` : ramener `min-height` sous 44 px dans la règle
de base, puis dans une media query, et constater l'échec chaque fois.

Les autres changements ne reçoivent pas de garde-fou : ce sont des choix de mise en page et de
formulation, pas des pièges structurels qu'un remaniement déferait sans le voir. En garder un serait
figer un style, ce qui n'a pas sa place dans ce harnais.

## Documentation

**Une phrase fausse.** [README.md:717](../../../README.md) décrit l'aperçu en direct comme une
« colonne collante à partir de 62 rem, bandeau en haut de l'étape en dessous ». Le bandeau **n'est
jamais rendu** : le CSS pose `.compose__side { display: none }` sous 62 rem, et l'aperçu y mesure
0 × 0. La phrase devient « Colonne collante à partir de 62 rem, masqué en dessous. »

Le renvoi qui la précède, « voir « L'assistant de composition » », **reste** : cette section existe,
ligne 913, et explique précisément pourquoi l'aperçu est masqué au téléphone.

**Un paragraphe pour ce chantier.** La section « L'assistant de composition » consigne les décisions
de cet ordre — la barre d'action y documente déjà son passage à 44 px. Elle reçoit, après le
paragraphe sur l'aperçu, un paragraphe qui dit ce qui a été densifié et de combien, ce qui a été
écarté et pourquoi, et le passage de l'échelle d'étapes à 44 px. Ses chiffres sont ceux **relevés
sur le code réel**, pas ceux de la simulation.

La section « Ce qui est personnalisable » ne décrit pas les lignes d'aide mot pour mot, et n'a pas à
changer.

## Hors périmètre

`ImageField`, qui sert à cette étape pour la photo d'en-tête et l'image du lien, garde le trio
cadre-de-collage / champ d'adresse / `<input type="file" hidden>`. C'est le défaut d'accès clavier
corrigé sur la vignette des cadeaux au chantier précédent : `hidden` vaut `display: none`, qui n'est
pas focalisable. Il relève de l'accessibilité et non de la densité, et n'est pas traité ici.

## Mesure attendue

| | avant | après |
|---|---|---|
| page de l'étape 3, à 375 × 812 | 4 453 px | ≈ 4 168 px |
| espacement de l'étape 3, à 768 | — | −152 px |
| grille des palettes, à 375 | 401 px | 237 px |
| boutons de l'échelle, toutes largeurs | 39 à 41 px | 44 px |

Le plan d'implémentation relèvera ces chiffres sur le code réel, et non sur la simulation, avant de
conclure.
