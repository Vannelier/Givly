# La page d'exemple — voir une page-cadeau avant d'en composer une

**Date** : 2026-09-12
**État** : validé, prêt pour le plan d'implémentation

## Le problème

L'accueil explique le produit ; il ne le montre pas. Le téléphone dessiné à côté de l'accroche est
une maquette figée, et son commentaire le dit : « purement décorative : la vraie page est rendue par
GiftView ». Rien ne permet de toucher une page-cadeau avant d'en avoir composé une — ni le voile
qu'on lève, ni les confettis, ni le choix qu'on confirme.

Or c'est cette mise en scène qui distingue MyPresentsForYou d'une liste de souhaits. La montrer, c'est
montrer le renversement lui-même : le donneur propose, le receveur choisit.

## Ce qu'on construit

Un bouton **« Voir un exemple »** sur l'accueil, qui mène à une page **`/exemple`** : une vraie
page-cadeau, jouable de bout en bout, sur des données figées.

### Pourquoi une page, et non un aperçu par-dessus l'accueil

Trois emplacements ont été pesés :

- **Une page dédiée** — retenue. Une adresse se partage (« regarde, c'est ça »), le bouton retour du
  navigateur fonctionne sans rien coder, et l'accueil reste une page serveur légère.
- **Un aperçu plein écran par-dessus l'accueil**, comme le bouton « Aperçu » de l'éditeur — écarté :
  rien à partager, et l'accueil aurait embarqué un îlot de page interactive.
- **Remplacer le téléphone dessiné par une vraie page miniature** — écarté : le voile et les
  confettis dans un petit cadre, et un accueil plus lourd à charger, alors que c'est la page qui
  compte le plus pour le référencement.

### Pourquoi pas la démonstration qui existe déjà

`db/seed.sql` insère une page de démonstration, `/pour-toi-demo`. C'est une vraie page en base : le
premier visiteur qui y choisirait un cadeau la **verrouillerait** pour tous les suivants. Elle ne
porte en outre que deux cadeaux, sans image, dont un collier. Elle reste telle quelle, pour le
développement.

### Le contenu

**Occasion anniversaire** : palette terracotta, décor de bougies, confettis, voile à lever. Les
textes sont **ceux que propose l'occasion** — « Joyeux anniversaire », « Un an de plus, et un cadeau
à choisir toi-même. », « Ouvrir mon cadeau », « Excellent choix. Bon anniversaire ! » —, lus dans
`lib/occasions.ts` et non recopiés. L'exemple montre ainsi exactement ce qu'on obtient sans rien
écrire, et suit toute retouche de ces formules.

**Des prénoms épicènes** : la page s'adresse à Camille, et elle est signée Sacha. La neutralité ne
s'arrête pas aux cadeaux.

**Quatre cadeaux**, en alternant expérience et objet pour que le mélange se voie :

| cadeau | note |
|---|---|
| Un saut en parachute | En tandem avec un moniteur. Tu choisis le jour. |
| Un appareil photo instantané | Et trois recharges pour commencer. |
| Un dîner au restaurant | Une table pour deux, là où tu en as envie. |
| Un casque audio sans fil | Pour tes trajets, et le calme qui va avec. |

**Le mot du receveur est activé**, pour que le parcours se voie en entier, jusqu'à l'écran qui suit
le choix.

### Jouable, sans rien envoyer

La page rend `GiftView` en **mode aperçu**. Dans ce mode, `confirm()` et `sendReply()` rendent la
main avant toute requête (`components/GiftView.tsx`, vers les lignes 392 et 426) : on lève le voile,
on choisit, on confirme, on écrit un mot — et rien ne part. N'importe qui peut la jouer, autant de
fois qu'il veut, sans rien écrire en base ni solliciter une seule route de l'API.

### Ce qui dit que c'est un exemple

- **Un bandeau en haut**, le même que celui de l'aperçu de l'éditeur (`.preview-ribbon`, collé en
  haut, sur fond d'encre) : « Exemple — rien n'est envoyé », avec un lien « Composer la mienne »
  vers `/creer`, à l'allure de `.preview-ribbon__exit`. Le voile, en position fixe et au-dessus, le
  recouvre pendant l'ouverture, exactement comme dans l'éditeur. C'est accepté : le visiteur arrive
  d'un bouton qui dit « exemple ».
- **L'écran de fin.** En mode aperçu, `GiftView` y propose « Revenir au formulaire », un libellé
  propre à l'éditeur. Sur `/exemple`, il devient **« Composer ma page-cadeau »** et mène à `/creer` :
  c'est là que l'exemple convertit. `GiftView` reçoit pour cela un libellé optionnel ; l'éditeur
  garde le sien.

### Le bouton de l'accueil

Dans le bloc d'action de l'accroche, `.lp-cta`, juste après « Composer ma page-cadeau », qui reste
l'action principale : **« Voir un exemple »**, en bouton secondaire (`btn btn--ghost`), vers
`/exemple`.

`.lp-cta` est une colonne centrée au téléphone, et une rangée au-delà de 52 rem, avec la note
« Gratuit · sans compte · trois étapes ». L'ordre devient : bouton principal, bouton secondaire,
note. Il se mesure aux deux largeurs — aucun débordement, la note lisible.

Le téléphone dessiné ne change pas.

### Les photos

**De vraies photos**, et non des illustrations : l'exemple doit montrer l'état réel du produit. Les
donneurs collent des liens produit, donc des photos, et deux comportements de la carte n'ont de sens
qu'avec elles — le fond flouté tiré de l'image, et le bouton de zoom.

- **Quatre photos libres de droits**, depuis Unsplash ou Pexels, dont les licences n'exigent pas de
  crédit.
- **Neutres** : aucun visage au premier plan. Le ciel et le parachute vus de loin, une table dressée,
  les objets seuls.
- **Aucun téléchargement sans accord** : chaque photo est proposée d'abord, avec sa source, sa
  licence et son poids.
- **Réduites par `sharp`**, déjà dans le projet, à 1 200 px sur leur plus grand côté, et servies
  depuis `public/exemple/`. Locales et non liées à distance, comme le veut la règle du README :
  « les images sont recopiées, jamais hotlinkées ».
- **Sources et licences consignées** dans le README.

### Référencement

- `/exemple` est une page publique, **indexable**, inscrite au sitemap (priorité 0,7), avec son
  propre titre, « Exemple de page-cadeau », et sa description. Au contraire des pages-cadeau, qui
  sont privées et portent `noindex`, l'exemple est public par nature.
- `exemple` rejoint `RESERVED_SLUGS` : le garde-fou « toute page du site occupe un slug réservé »
  l'exige dès que le dossier `app/exemple/` existe.
- **Avant de déployer, vérifier en base qu'aucune carte n'existe déjà à `/exemple`.** Une route fixe
  l'emporte sur `[slug]` : une telle carte deviendrait inaccessible, en silence. Ce travail ne le
  vérifie pas — ce serait interroger la base de production.

## Ce qui ne change pas

Aucune table, aucun champ, aucune route d'API, aucune migration. L'éditeur garde « Revenir au
formulaire ». Le téléphone dessiné de l'accroche, l'action principale et `/pour-toi-demo` restent tels
quels.

## Garde-fous

Deux vérifications dans `scripts/check.ts`, chacune sur un piège qu'un remaniement futur déferait
sans qu'on le voie, et chacune **testée par mutation** comme l'exige `CLAUDE.md`. Elles lisent les
sources par `lire()`, comme tout le harnais depuis la PR #26.

1. **L'exemple reste en mode aperçu.** `app/exemple/page.tsx` doit rendre `GiftView` avec
   `mode="preview"`. En mode direct, le premier visiteur qui choisit enverrait une requête à
   `/api/pages/exemple/choose` — au mieux une erreur affichée sur la page censée convaincre, au pire
   une écriture sur une carte réelle qui porterait ce slug.
2. **Chaque photo de l'exemple existe.** Chaque `image_url` de `lib/exemple.ts` doit désigner un
   fichier présent sous `public/`. Une photo renommée ou oubliée afficherait une image cassée,
   précisément là où le produit doit séduire.

## Documentation

Le README reçoit la route `/exemple` dans sa table des routes, et un court paragraphe sur la page
d'exemple : ce qu'elle montre, pourquoi elle ne vit pas en base, et la source et la licence de
chaque photo.

## Mesure

Avant de conclure, dans un navigateur, **page posée** — polices chargées et une demi-seconde de
répit, leçon du chantier précédent, où une mesure prise trop tôt avait menti de 90 px :

- à 375 et à 1440 : le voile et son ouverture, les confettis, les quatre cartes et leurs photos, le
  choix, la confirmation, le mot du receveur ;
- le journal réseau : **aucune requête vers `/api/`** de tout le parcours ;
- la console : aucune erreur d'hydratation ;
- l'accueil à 375 et à 1440 : les deux boutons et la note, sans débordement horizontal ;
- le poids des quatre photos.

## Hors périmètre

- Le téléphone dessiné reste une maquette figée. Le rendre cliquable contredirait son rôle décoratif
  (`aria-hidden`).
- Pas de second lien vers l'exemple en bas de l'accueil : l'accroche seule.
- `/pour-toi-demo` n'est pas touchée.

La branche part de `main` : la branche « Présentation », encore ouverte, ne touche ni l'accueil ni
`GiftView`.
