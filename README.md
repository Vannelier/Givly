# Givly

Composer une petite page-cadeau, envoyer un lien, laisser la personne choisir.

Le donneur rassemble jusqu'à 10 propositions (produits de n'importe quel marchand, activités),
obtient un lien public et un lien d'administration secret. Le receveur ouvre le lien, choisit,
confirme. Le donneur retrouve le choix dans sa vue admin, puis commande lui-même.

**Aucun paiement ne transite par la plateforme. Aucune adresse n'est collectée.**

---

## Stack

- Next.js 15 (App Router, TypeScript)
- Postgres via le pilote `pg` — table unique `gift_pages`, n'importe quel
  hébergeur convient (Railway, Neon, Supabase, local)
- Vercel Blob pour les images — avec un repli sur un dossier local en développement
- `sharp` pour réduire toute image en entrant
- `node-html-parser` pour lire les métadonnées Open Graph (pas de navigateur headless)
- `qrcode` pour le QR code du lien public

## Mise en route

### 1. Provisionner les services

**Il faut un Postgres.** N'importe lequel : Railway, Neon, Supabase, ou une instance locale — le
pilote est `pg`, rien n'est spécifique à un hébergeur.

**Vercel Blob est facultatif en développement.** Sans `BLOB_READ_WRITE_TOKEN`, les images atterrissent
dans un dossier `.media/` local. En production c'est une autre affaire : voir « Le stockage des
images ».

Sur Vercel, les intégrations **Postgres** et **Blob** injectent ces variables toutes seules. Ailleurs,
il faut les poser à la main.

### 2. Variables d'environnement

Copier `.env.example` vers `.env.local` et le remplir. Sur Vercel, `npx vercel env pull .env.local`
récupère les valeurs du projet.

| variable | rôle |
|---|---|
| `POSTGRES_URL` | connexion poolée (lecture/écriture applicative) |
| `POSTGRES_URL_NON_POOLING` | connexion directe, utilisée par la migration |
| `POSTGRES_PRISMA_URL` | injectée par Vercel ; le code ne la lit jamais |
| `BLOB_READ_WRITE_TOKEN` | écriture Vercel Blob ; absent, repli sur `.media/` |
| `NEXT_PUBLIC_BASE_URL` | base absolue des liens, balises Open Graph, `robots.txt` et sitemap |
| `FREE_PAGE_TTL_DAYS` | durée de vie d'une page gratuite (défaut : 30) |
| `RATE_LIMIT_DISABLED` | `1` coupe les quotas. Développement seulement — voir « Les routes anonymes » |

### 3. Créer le schéma

```bash
npm run db:migrate
```

Ajouter `-- --seed` pour insérer une page de démonstration (`/pour-toi-demo`).
Le script est idempotent : le rejouer ne casse rien.

Cette étape n'est nécessaire **qu'en développement** : `npm run dev` ne lance pas `scripts/boot.mjs`,
alors que `npm start` — la commande de production — applique le schéma à chaque démarrage. Voir
« Déployer ».

### 4. Lancer

```bash
npm run dev
```

> **Un Postgres local convient parfaitement.** Le pilote `pg` parle à n'importe quelle instance, et
> `sslFor()` désactive TLS pour `localhost`, `127.0.0.1` et les hôtes en `.internal` / `.local`.
> Cette note disait le contraire tant que le projet utilisait `@vercel/postgres` ; ce n'est plus le
> cas depuis le passage à `pg`.
>
> Sans `POSTGRES_URL`, rien n'est bloqué au démarrage : les routes qui touchent la base répondent
> 503 avec un message explicite, tandis que le formulaire de création, l'aperçu en direct et
> l'aperçu plein écran fonctionnent normalement — ils ne lisent rien.

## Scripts

| commande | effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run check` | vérifications de la logique pure : validation, slugs, extraction, expiration, quotas, réduction d'images — aucune base requise |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | applique `db/schema.sql` (`-- --seed` pour la page de démo) |
| `npm run brand` | régénère le favicon, les icônes et le SVG de la marque |

## En cas de pépin

**`Cannot read properties of undefined (reading 'call')` dans `webpack.js`**, ou
`__webpack_modules__[moduleId] is not a function` dans les logs : le dossier `.next` est
incohérent. Ce n'est pas un bug de l'application.

```bash
rm -rf .next && npm run dev
```

Cause la plus fréquente : avoir lancé `npm run build` pendant que `npm run dev` tournait.
Les deux écrivent dans le même `.next` et le graphe de modules du serveur de dev se retrouve
à moitié écrasé. Arrête le serveur de dev avant de builder.

## Carte du code

| chemin | rôle |
|---|---|
| `app/page.tsx` | page d'accueil : présente l'outil et renvoie vers `/creer` |
| `app/creer/page.tsx` | assistant de création, en trois étapes |
| `app/[slug]/page.tsx` | page-cadeau publique (SSR + `generateMetadata` pour l'aperçu de lien) |
| `app/admin/[token]/page.tsx` | vue admin : cadeau choisi, liens, édition, clôture |
| `components/GiftView.tsx` | le rendu que voit le receveur — **le même** composant sert à l'aperçu |
| `components/editor/PageEditor.tsx` | assistant partagé création / édition |
| `lib/palettes.ts` | les neuf palettes ; seul leur identifiant est stocké |
| `lib/occasions.ts` | occasions et polices ; idem, seuls les identifiants sont stockés |
| `components/GiftMotif.tsx` | décors SVG des occasions |
| `components/GiftCover.tsx` | voile d'ouverture et compte à rebours |
| `scripts/brand.mjs` | fabrique la marque : `app/icon.svg`, `app/favicon.ico`, les PNG |
| `app/opengraph-image.tsx` | la bannière de partage du site (1200 × 630) |
| `components/PrintableCard.tsx` | l'atelier d'impression : la feuille A4 pliable et ses réglages |
| `components/CardPreview.tsx` | l'aperçu de la carte + « Carte à imprimer » / « Télécharger le QR » |
| `components/PrintCarousel.tsx` | les flèches qui font défiler le pictogramme de fond |
| `components/PrintColorSlider.tsx` | le curseur de teinte de la carte |
| `components/PrintSlider.tsx` | les curseurs de taille et de contraste du décor |
| `lib/printModels.ts` | les trois dispositions et les douze pictogrammes |
| `lib/carteCouleur.ts` | la rotation de teinte : hex ↔ HSL, et les variables surchargées |
| `lib/mediaStore.ts` | où atterrissent les images : Vercel Blob, ou disque en développement |
| `lib/extract.ts` | lecture des métadonnées OG, best-effort |
| `lib/blob.ts` | recopie des images vers Vercel Blob |
| `lib/validation.ts` | validation des entrées, avant toute écriture |
| `lib/rateLimit.ts` | quotas des routes anonymes ; logique pure, horloge injectable |
| `lib/site.ts` | **identité de l'éditeur** — le seul fichier à remplir pour les mentions légales |
| `components/TextPage.tsx` | coquille commune aux pages de texte |
| `components/SiteFooter.tsx` | pied de page et liens légaux |
| `lib/db.ts` | **seul** point de contact avec Postgres (pilote `pg`, gabarit paramétré) |

### Pages

| route | rôle |
|---|---|
| `/` | accueil — invite à composer |
| `/creer` | formulaire de création, puis l'écran « Ta page est prête » |
| `/questions` | questions fréquentes — la page faite pour être trouvée |
| `/contact` | comment nous joindre |
| `/confidentialite` | politique de confidentialité |
| `/conditions` | conditions d'utilisation |
| `/mentions-legales` | éditeur et hébergeur — `noindex` |
| `/[slug]` | page-cadeau publique — `noindex` |
| `/admin/[token]` | vue admin — `noindex` |

Les slugs `admin`, `api`, `creer`, `_next`, `icon`, `apple-icon`, `opengraph-image`,
`twitter-image`, `favicon.ico`, `robots.txt`, `sitemap.xml` et `manifest.webmanifest` sont
réservés : `/[slug]` les traite en 404 sans requête en base. Les noms à points ne peuvent de toute
façon pas former un slug ; ils restent listés pour que la liste dise ce qui est pris.

`/robots.txt` laisse explorer les pages-cadeau — c'est en les lisant qu'un robot voit leur
`noindex` — mais interdit `/admin/` : un jeton d'administration n'a rien à faire dans un index.
`/sitemap.xml` ne déclare que l'accueil et `/creer`, jamais les cartes.

### API

| route | effet |
|---|---|
| `POST /api/extract` | `{ url }` → `{ ok: true, image, title?, siteName? }` ou `{ ok: false, reason }`. Ne jette jamais. |
| `POST /api/upload` | image (repli manuel) → Vercel Blob → `{ url }` |
| `POST /api/pages` | crée la page (aucun champ de texte obligatoire) → `{ slug, publicUrl, adminUrl, expiresAt, warnings }` |
| `PATCH /api/admin/[token]` | édite la page ; 409 si verrouillée ou expirée |
| `DELETE /api/admin/[token]` | supprime la page |
| `POST /api/pages/[slug]/choose` | `{ itemId }` → enregistre le choix et verrouille |
| `POST /api/pages/[slug]/reply` | `{ reply }` → attache le mot du receveur, après le choix ; 409 hors fenêtre ou si un mot existe déjà |

**Toutes ces routes peuvent répondre `429`** avec un en-tête `Retry-After` et un `{ error }` en
français, avant toute validation — voir « Les routes anonymes et leurs quotas ».

## Ce qui est personnalisable

L'assistant tient en **trois étapes** : l'occasion, les cadeaux, la présentation. Cette dernière
est découpée en cadres qui suivent, dans l'ordre, les trois écrans que traverse la personne qui
reçoit — **Intro**, **Cadeaux**, **Choix** — suivis du thème et du lien.

| réglage | cadre | effet |
|---|---|---|
| **Occasion** | *étape 1* | Preset complet : palette, décor, effet et formulations de départ d'un coup. Seize occasions, rangées en quatre rubriques. Toute l'étape à elle seule. |
| **Prénom** | Intro | « Pour Sophie », tout en haut du voile. |
| **Mot d'ouverture** | Intro | La ligne au-dessus du titre. Vide = celle de l'occasion. |
| **Message principal** | Intro | Le grand titre du voile, et le titre de l'aperçu de lien. |
| **Texte du bouton** | Intro | Le bouton qui lève le voile. Vide = la suggestion de l'occasion (« Ouvrir », « Ouvrir mon cadeau »…). |
| **Ouverture** | Intro | Le voile à lever, en six styles : voile, rideau, volets, enveloppe, couvercle, halo. Désactivable. |
| **Date de révélation** | Intro | Avant elle, la carte reste scellée sur un compte à rebours. |
| **Mot d'attente** | Intro | Sous le compte à rebours, tant que la carte est scellée. Vide = la suggestion de l'occasion. |
| **Photo d'en-tête** | Intro | Une photo large en haut de la carte. |
| **Titre** | Cadeaux | Au-dessus des cadeaux. Vide = « À toi de choisir ». |
| **Contenu** | Cadeaux | La ligne sous ce titre. Vide = « Choisis celui qui te fait le plus envie. » |
| **Signature** | Cadeaux | Une ligne en bas de page. Facultative. |
| **Message de fin** | Choix | Après la confirmation du choix. |
| **Mot du receveur** | Choix | Un bouton, sur l'écran de confirmation, qui ouvre la saisie. Désactivé par défaut. |
| **Palette** | Thème | Neuf palettes. Réglée par l'occasion, modifiable ensuite. |
| **Police du titre** | Thème | Sept : Élégant, Classique, Délicat, Net, Rond, Manuscrit, Calligraphie. |
| **Disposition** | Thème | Grille à deux colonnes, ou liste. Les deux se distinguent dès le téléphone. |
| **Décor** | Thème | Le motif de l'occasion, désactivable. |
| **Effet** | Thème | Neuf effets, joués une fois sur la page découverte. Proposé par l'occasion. |
| **Nom de la carte** | Lien | Jamais montré. Il fabrique l'adresse du lien. |
| **Personnaliser le lien** | Lien | Le texte cliquable et l'image que montrent WhatsApp et les SMS. |

**Chaque écran a ses propres mots.** Le voile porte le prénom, le mot d'ouverture et le message
principal ; l'écran des cadeaux porte son titre et son contenu ; l'écran de confirmation porte le
message de fin. Le voile et l'écran des cadeaux répétaient auparavant les deux mêmes lignes, lues
coup sur coup. Quand l'ouverture animée est désactivée, il n'y a plus de voile où loger l'intro :
l'écran des cadeaux la reprend alors à son compte, en tête, et son propre titre passe en `h2`.

**Le facultatif se replie.** Un réglage optionnel est d'abord une case à cocher ; le champ
n'apparaît qu'une fois cochée (composant `Optional`). Décocher **efface la valeur** : un réglage
invisible mais toujours actif — une date de révélation oubliée, par exemple — serait un piège.
Un repli s'ouvre d'emblée si le champ porte déjà une valeur, pour qu'en édition rien de rempli ne
se cache.

Sont repliés : l'ouverture animée, la date de révélation, la photo d'en-tête, le mot du receveur et
la personnalisation du lien. Les champs de texte des trois cadres, eux, sont toujours visibles :
une case à cocher devant un champ facultatif ne protégeait de rien et ajoutait un geste.

**Aucun champ de texte n'est obligatoire.** Laissé vide, un champ prend la valeur de la suggestion
que le donneur avait sous les yeux en placeholder : les messages reprennent la formule de
l'occasion, un cadeau sans titre devient « Sans titre », et le nom de la carte se compose à partir
de l'occasion et du prénom. Il ne reste qu'une exigence, structurelle : il faut au moins un cadeau
à choisir.

**Une occasion est un preset, pas une contrainte.** La choisir repose palette, décor et effet, et met
à jour le mot d'ouverture — mais uniquement s'il était encore celui de l'occasion précédente. Un
texte écrit à la main n'est jamais écrasé.

**Elle est la première des trois étapes.** Elle vivait à la fin, donc après la saisie : un preset
qui arrive après coup écrase ce qu'on vient d'écrire, et la règle ci-dessus est née de là. Elle
reste utile — on peut changer d'occasion en cours de route — mais elle n'est plus le rempart
qu'elle était.

**Une étape à elle, et non un cadre en tête des cadeaux.** Seize occasions en quatre rubriques,
c'est le plus gros bloc de l'éditeur : posé au-dessus de la liste, il repoussait le titre « Les
cadeaux » à 1 211 px du haut sur un 1440, 1 337 px sur un 390. Un repli en résumé une fois le choix
fait ramenait ces mesures à 481 px et 418 px, mais c'était une rustine pour tenir dans une étape
partagée. Isolée, l'occasion tient dans un écran et ne gêne plus rien : le titre « Les cadeaux »
ouvre maintenant sa propre étape à **352 px** du haut sur un 1440, **305 px** sur un 390, et le
repli a disparu avec son objet.

L'étape de l'occasion **ne valide rien** : une occasion est toujours posée, « Sans occasion »
comprise, et aucun choix n'y est invalide. Elle existe pour l'ordre, pas pour poser une question à
laquelle on pourrait mal répondre.

Les suggestions du titre et du contenu de l'écran des cadeaux, elles, sont **communes à toutes les
occasions** (`ITEMS_TITLE_HINT`, `ITEMS_MESSAGE_HINT`) : cet écran est fonctionnel, le décorum de
l'occasion vit sur le voile juste avant.

**Le décor est un SVG en `currentColor`**, pas une image : il suit la palette sans code de couleur
en dur, ne coûte aucun téléchargement, et se désactive en une case à cocher. Il n'apparaît que pour
les occasions qui en proposent un.

Douze décors, tous dans `components/GiftMotif.tsx` : confettis, flocons, cœurs, étoiles, guirlande,
feuilles, pattes, pas de bébé, bougies, cadeaux, alliances — plus « aucun ». Le même composant sert
la page-cadeau, le voile **et** la carte à imprimer : en ajouter un le rend disponible partout d'un
coup.

Trois d'entre eux illustrent ce qui fait qu'un pictogramme se lit ou non :

- **Les cadeaux laissent le ruban en creux.** Tout est peint dans la même couleur ; un ruban plein
  sur une boîte pleine ne se verrait pas. Ce sont les deux fentes entre les quatre quartiers qui
  font lire « paquet » plutôt que « rectangle ».
- **Les alliances sont en trait** — un anneau plein n'est plus un anneau — et c'est leur
  chevauchement qui dit l'union.
- **La bougie n'a pas de mèche.** Une première version en avait une : peinte de la même couleur,
  elle soudait la flamme au corps, et l'ensemble se lisait comme une balle de fusil. C'est le vide
  entre les deux qui dit que ça brûle.

Un garde-fou dans `npm run check` exige que **`GiftMotif` porte un tracé pour chaque décor du
catalogue** : un `MotifKind` ajouté sans son `case` compile sans broncher et rend un `<pattern>`
vide — le décor serait proposable, sélectionnable, et invisible.

`--motif-opacite` porte l'opacité du décor, avec `0.11` en repli. La page-cadeau ne la pose nulle
part et garde donc exactement le décor qu'elle avait ; seule la carte à imprimer la règle.

**En base, seuls les identifiants sont stockés** (`theme.occasion`, `theme.palette.id`,
`theme.font`, `theme.opening`, `theme.effect`). Les couleurs et les motifs vivent dans
`lib/palettes.ts` et `lib/occasions.ts` :
retoucher un thème met à jour toutes les pages déjà créées, et un identifiant inconnu retombe
proprement sur la valeur par défaut. Rien d'autre qu'un identifiant connu n'est accepté du client.

## Le poids des images

**Toute image est réduite en entrant, jamais à l'affichage** (`lib/image.ts`, appelé par
`storeImage`). Côté le plus long ramené à **1 200 px**, format conservé, aucun réencodage si
l'image est déjà assez petite — réencoder pour rien ne ferait que perdre de la qualité.

La vignette d'une carte mesure 385 px en CSS, soit 1 155 sur un écran à trois pixels par point :
au-delà de 1 200, plus rien ne se voit. Ce qui se paie, en revanche, c'est la mémoire — une image
occupe `largeur × hauteur × 4` octets une fois décodée, **quelle que soit la taille de son
fichier**. Mesuré sur quatre formats typiques :

| source | après | fichier | bitmap décodé |
|---|---|---|---|
| fiche marchande 1500 × 1045 | 1200 × 836 | 790 → 242 Ko | 6,0 → 3,8 Mo |
| photo de boutique 1500 × 1500 | 1200 × 1200 | 1131 → 346 Ko | 8,6 → 5,5 Mo |
| **photo de téléphone 3024 × 4032** | 900 × 1200 | 6100 → 93 Ko | **46,5 → 4,1 Mo** |
| déjà petite 800 × 600 | inchangée | 241 → 241 Ko | 1,8 → 1,8 Mo |

Le troisième cas est le plus important : « une photo depuis ton téléphone suffit » est le chemin
de repli nominal quand l'extraction échoue. Une carte de dix cadeaux remplie ainsi transportait
60 Mo et faisait décoder près de 465 Mo de bitmaps — de quoi saturer un téléphone, qui recycle
l'onglet bien avant.

`shrinkImage` **ne jette jamais** : une image que `sharp` ne sait pas lire ressort telle quelle.
Refuser un téléversement pour un problème de taille serait pire que stocker une image trop grande.

## Ce qui est fait pour que la page-cadeau reste fluide

- **Les cartes hors écran ne sont ni mises en page, ni peintes** (`content-visibility: auto` sur
  `.items > li`, avec `contain-intrinsic-size: auto` pour que la barre de défilement ne saute pas).
  Avec dix cadeaux portant chacun une photo affichée deux fois — l'originale et sa copie floutée —
  seules les cartes visibles coûtent quelque chose.
- **Pas de `background-attachment: fixed`.** Il interdit au navigateur de déplacer la couche de fond
  au défilement, qui doit alors être repeinte à chaque image : c'est la cause de saccade la plus
  courante au téléphone. Le dégradé étant un halo ancré en haut de page, le fixer n'apportait rien
  de visible — et sur la page-cadeau il était de toute façon recouvert par le fond opaque de
  `.gift-root`.
- **Pas de `text-rendering: optimizeLegibility`.** Il force le calcul des ligatures et du crénage sur
  tout le texte, pour un gain nul sur des polices déjà rendues correctement par défaut.
- **Les images sont en chargement différé** (`loading="lazy"`, `decoding="async"`).

## Le stockage des images

En production, Vercel Blob. **En développement, un dossier `.media/` local**, servi par
`/api/media/[name]`.

Sans ce repli, rien de ce qui touche aux images ne fonctionne tant qu'on n'a pas de compte Vercel :
ni le téléversement, ni le collage, ni la recopie des images de marchands. `/api/upload` répondait
503 et la vignette clignotait sans rien afficher — c'était le symptôme.

Le repli disque est refusé sur Vercel, dont le système de fichiers est éphémère : une image écrite
là disparaîtrait au déploiement suivant. La route de service n'accepte qu'un nom de fichier
strictement conforme (`^[a-z0-9-]+\.(jpg|png|webp)$`), ce qui rend toute remontée de chemin
impossible.

## Le cadeau unique

Le minimum est de **un** cadeau, pas deux. Avec un seul, la carte cesse d'être un choix pour
devenir une annonce : la carte n'est plus cliquable, le sous-titre devient « C'est pour toi », et le
bouton « Confirmer mon choix » devient « Merci ! ».

C'est un accusé de réception, et il réutilise exactement la mécanique existante (`chosen_at`,
verrouillage, vue admin) : le donneur voit que sa carte a été ouverte et quand. Aucune donnée
nouvelle, une intention différente.

## Le mot du receveur

Optionnel, et **désactivé par défaut** : si le donneur fait scanner le QR code devant la personne,
un champ de réponse n'a aucun sens. Activé, son contenu remonte dans la vue admin avec le choix.

**Il arrive après le choix, plus à côté de lui.** La zone de texte posée sous les cadeaux se lisait
comme une case à remplir avant de pouvoir confirmer, alors qu'elle était facultative. Le choix part
donc seul, et l'écran de confirmation propose ensuite un bouton « Laisser un mot » qui ouvre la
saisie.

Ce détachement a un coût : le mot ne voyage plus dans la même requête que le choix, donc plus rien
ne garantit à lui seul que c'est bien l'auteur du choix qui écrit. Deux gardes referment la porte,
posés en SQL dans le `WHERE` de `POST /api/pages/[slug]/reply` :

- **un seul mot par carte** — `reply_message = ''` ;
- **dans l'heure qui suit le choix** — `chosen_at > now() - interval` (`REPLY_WINDOW_MS`,
  `lib/types.ts`). Le délai réel entre les deux gestes se compte en secondes.

Le bouton disparaît de lui-même une fois la fenêtre passée : `replyWindowOpen()` est partagé par la
route et par `GiftView`. Côté client, il n'est évalué qu'après le montage — l'heure courante diffère
forcément entre le rendu serveur et le navigateur, et l'évaluer plus tôt ferait diverger
l'hydratation sur une carte choisie il y a presque une heure.

Le serveur n'enregistre le mot que si l'option est active sur la page — une requête directe ne peut
pas glisser un texte dans une carte qui ne l'a pas demandé.

## La carte à imprimer

`/admin/[token]/imprimer` : une feuille A4 paysage pliée en deux, avec le QR code au dos et la
couverture devant. Tout en CSS et en SVG — rien à télécharger, et l'impression sort nette à
n'importe quelle taille.

### Trois axes indépendants, et non une liste de modèles

Il y avait dix combinaisons figées, parcourues à la flèche : une **disposition** et un **décor**
changeaient ensemble, sans qu'on puisse dire lequel on voulait, et l'immense majorité des
croisements étaient inatteignables. Les axes sont séparés :

| axe | valeurs | commande |
|---|---|---|
| **Disposition** | Classique, Affiche, Sobre | une rangée de trois |
| **Pictogramme de fond** | douze, ceux de `GiftMotif` | un carrousel, avec vignette |
| **Couleur** | teinte libre | un curseur, centré sur la couleur du thème |
| **Taille du décor** | ×0,4 à ×2,2 | un curseur |
| **Contraste du décor** | 2 % à 40 % | un curseur |

Deux dispositions ont disparu en chemin. **« Bandeau »** : son aplat d'accent était posé en
`::before` sans `z-index`, donc peint après le fond mais avant le contenu positionné — et le contenu
de la feuille l'est tout entier. L'aplat passait derrière le titre qu'il devait souligner.
**« Encadrée »** : retirée sur demande, son filet n'apportant rien que le décor de fond ne fasse
mieux depuis qu'on en règle la taille et le contraste.

**Le curseur de couleur ne fait tourner que la teinte.** Saturation et clarté restent celles de la
palette, couleur par couleur : c'est ce qui garde la carte dans le registre papier au lieu de la
faire virer au fluo. Sa course est **centrée sur la teinte du thème** et non calée sur 0-359 — la
teinte est un cercle, et une palette terracotta (accent à 13°) ouvrait avec le curseur collé contre
la butée gauche, ce qui se lit comme un réglage à zéro. Sur sa valeur d'origine, il ne surcharge
rien du tout : réécrire les mêmes couleurs à un arrondi près ferait dériver une carte qu'on n'a pas
touchée.

### Un seul décor pour la feuille entière

Chaque panneau portait le sien. Or un `<pattern>` commence son pavage au coin du dessin qui le
porte : la tuile repartait de zéro au milieu de la feuille, et le motif se cassait net sur le pli.
Il en faut **un seul**, posé sur la feuille.

L'ampleur de la rupture dépendait du réglage de taille, ce qui explique qu'elle passe parfois
inaperçue : à ×1 la tuile de confettis fait 140 px et le panneau 431, le saut ne valait donc que
11 px ; à ×2,2 la tuile monte à 308 et le saut à 123 — un tiers de tuile, en plein milieu.

### L'atelier : la carte et ses réglages à l'écran en même temps

La page empilait la barre, les réglages, les mots, puis la feuille, en une seule colonne. Le défaut
n'était pas que l'aperçu soit « en dessous » : c'est que **les réglages et l'objet qu'ils règlent
n'étaient jamais visibles ensemble**.

| mesuré | avant | après |
|---|---|---|
| défilement avant d'atteindre la carte (390 × 844) | 710 px | 76 px |
| défilement avant d'atteindre la carte (1440 × 900) | 657 px | 100 px |
| part de la carte visible au repos (1440) | 31 % | 100 % |
| largeur de fenêtre inutilisée (1440) | 62 % | 0 % |

Au-delà de **62 rem** : réglages à gauche sur 22 rem, carte à droite sur le reste. Les colonnes sont
posées **explicitement** (`grid-column: 1` / `2`) et non déduites de l'ordre du DOM — la carte y est
écrite en premier pour le téléphone, et sans cette consigne elle héritait de la colonne étroite.

En dessous : deux étages, la carte au-dessus et **collée en haut**, pour rester sous les yeux
pendant qu'on glisse un curseur. En `flex` et non en `grid` : le bloc englobant d'un élément collant
est sa zone de grille, et une zone de grille ne dépasse pas sa rangée — en grille à une colonne, la
carte se serait décollée au bout de ses propres 253 px.

**Le cadre de la feuille rogne** (`overflow: hidden`). `transform: scale()` réduit ce qu'on voit,
pas la boîte mise en page : celle-ci mesure toujours 297 mm, soit 1 122 px, et gonflait la largeur
du document à cette valeur pour une fenêtre de 430. Rien ne dépassait au `getBoundingClientRect` —
les rectangles rendus sont bien dans la fenêtre — ce qui rendait le défaut invisible à la relecture
comme à l'œil, mais la page défilait latéralement dans le vide.

**L'écran « Ta page est prête » et la vue admin ne montrent pas l'atelier**, mais un aperçu : voir
« L'aperçu de la carte » ci-dessous.

### Ses mots lui appartiennent

Ils reprennent d'abord ceux de la page-cadeau, et s'en détachent dès qu'on y touche — la page, elle,
ne bouge pas. Une page qu'on ouvre au téléphone et une carte qu'on tient dans la main n'appellent
pas la même formule. Cinq champs : destinataire, mot d'ouverture, titre, signature, et la ligne sous
le QR code.

**Gardés sur l'appareil, pas en base** (`lib/printTexts.ts`). Les persister demanderait cinq
colonnes, une migration et autant de règles de validation, pour un texte qu'on écrit une fois juste
avant d'imprimer. `localStorage` couvre le vrai risque — recharger la page, ou revenir imprimer un
deuxième exemplaire — sans rien ajouter au schéma. C'est le même arbitrage que pour le modèle de
carte, et le même mécanisme que le brouillon de composition : une clé par carte, une version qui
invalide les formes anciennes, une péremption à 30 jours (la durée de vie d'une page gratuite), et
tous les accès enveloppés dans des `try` — en navigation privée, lire `localStorage` lève.

Le panneau est replié par défaut : neuf fois sur dix les mots de la page conviennent, et un
formulaire ouvert d'office ferait croire qu'il y a quelque chose à remplir avant d'imprimer.

## L'ouverture de la carte

Six manières de lever le voile, et **la géométrie appartient à chaque style**, pas au panneau.
C'était le défaut d'origine : les deux panneaux étaient figés en moitiés gauche et droite — une
forme taillée pour le rideau — et l'enveloppe se contentait de les faire basculer autour de leur
arête haute. Deux bandes verticales qui tombent en arrière ne ressemblent à aucun rabat, alors même
que le sélecteur de l'éditeur en dessinait un, triangulaire, depuis le début. **L'aperçu promettait
ce que l'animation ne rendait pas.**

| style | ce qui se passe |
|---|---|
| **Voile** | Les deux moitiés s'effacent en montant légèrement. |
| **Rideau** | Deux pans s'écartent sur les côtés, avec un tombé de plis et une ombre sur le bord intérieur. |
| **Volets** | Le haut monte, le bas descend. |
| **Enveloppe** | Un rabat triangulaire bascule autour de sa pliure, puis le corps glisse vers le bas. |
| **Couvercle** | Le voile se décolle, s'incline et s'en va d'un bloc. |
| **Halo** | Un cercle se resserre vers le centre et s'efface. |

**Le voile était peint de la couleur de ce qu'il cachait.** `--paper` sur `--paper`, opaque et
pourtant invisible : quel que soit le mouvement, l'écran restait de la même teinte du début à la
fin, et l'ouverture se réduisait au texte qui s'efface. Les panneaux prennent donc `--paper-warm`,
plus soutenu — le pan qui s'écarte laisse voir une page plus claire derrière lui. C'est cette seule
nuance qui rend les six animations lisibles.

Trois détails donnent au rideau le poids d'un tissu, là où deux rectangles glissaient : un tombé de
plis en dégradé répété, une ombre portée sur le bord intérieur, et un léger contretemps de 60 ms
entre les deux pans.

Toutes les fermetures tiennent en **0,95 s**, la durée que `GiftView` attend avant de retirer le
voile (`COVER_CLOSE_MS`). Allonger l'une sans l'autre couperait l'animation en plein vol.

## La grille et la liste

**Deux colonnes dès le téléphone.** La grille n'y passait à deux colonnes qu'à partir de 34 rem,
soit 544 px — aucun téléphone n'atteint cette largeur. « Grille » et « Liste » y donnaient donc la
même colonne unique, et le réglage ne servait à rien là où la carte est justement lue.

Ce qui a fait trouver le défaut : **l'aperçu de l'éditeur forçait déjà deux colonnes** dans son
cadre de 390 px. Il montrait au donneur une disposition que le receveur ne verrait jamais.

**La carte est un `<button>`, et un bouton étiré centre verticalement son contenu.** Dans une rangée
où les cartes s'alignent sur la plus haute, la plus courte se retrouvait avec autant de blanc
au-dessus de sa vignette qu'en dessous — mesuré à 26 px de part et d'autre sur un téléphone de
390 px. Invisible tant que la grille restait à une colonne ; flagrant dès qu'elles se côtoient.
`.card` passe donc en colonne flex, et `.card__body` prend le mou : la vignette reste en haut, le
fond blanc descend jusqu'en bas.

## La carte d'un cadeau

**L'anneau de sélection fait le tour complet.** Il était dessiné en
`box-shadow: inset`, et une ombre intérieure se peint *sous* le contenu de l'élément : la vignette,
qui touche les bords haut, gauche et droit, passait devant. Ne restait visible que le morceau
longeant le bandeau blanc du bas — d'où un cadre qui semblait coupé au-dessus. C'est désormais un
pseudo-élément `::after` posé au-dessus du contenu, que rien ne peut recouvrir.

**Seule la position s'anime.** `box-shadow` et `border-color` sont sortis de la transition : une
ombre portée floue se recalcule à chaque image sur toute la surface de la carte, photo comprise.
L'anneau passe par l'opacité du pseudo-élément, que le compositeur fait varier sans repeindre.

**La photo s'ouvre en grand** (`GiftZoom`). Une vignette de 168 px ne suffit pas à juger d'un bijou :
c'est le détail qui décide du choix. Le bouton `⤢` est **frère de la carte, pas enfant** — celle-ci
est un `<button>`, et un bouton dans un bouton n'est pas du HTML valide ; le navigateur défait
l'imbrication et le clic devient imprévisible. Posé en absolu par-dessus la vignette, il ne prend le
clic que sur son propre carré : partout ailleurs, on choisit le cadeau. En haut à gauche, la
pastille de validation occupant le coin opposé.

## Le rythme de l'ouverture

Une cérémonie, pas un écran utilitaire — **et un seul rythme du début à la fin**. Mesuré au
chronomètre dans le navigateur :

| l'écran d'accueil du receveur | à |
|---|---|
| le prénom | 1,36 s |
| le mot d'ouverture | 1,80 s |
| le titre | 2,60 s |
| le bouton d'ouverture | 2,88 s |

| après le clic | à |
|---|---|
| le voile a fini de se retirer | 1,52 s |
| le titre de l'écran des cadeaux est posé | 2,20 s |
| le premier cadeau | 3,92 s |
| le deuxième | 4,36 s |

**Le voile allait plus vite que ce qu'il annonce.** Le pas entre deux de ses lignes valait déjà
400 ms, tout près du pas entre deux cadeaux ; c'étaient les durées qui divergeaient — 0,9 s par
ligne quand le titre des cadeaux met 1,6 s à se poser. L'ouverture cassait le tempo au lieu de le
prolonger. Les lignes prennent 1,2 s, le titre du voile la même durée que celui des cadeaux
(`--titre-duree`), et le pas est exactement celui des cartes : **441 ms mesurés sur le voile,
440 ms sur les cadeaux**.

`--titre-duree` est déclarée sur `.gift-root` et non sur `.gift-items-head` : le voile s'en sert
aussi, et il n'en est pas un descendant. Deux titres, une seule valeur — c'est ce qui les empêche de
dériver l'un de l'autre. Le pas, lui, ne peut pas être `--reveal-step` : `GiftView` le resserre
quand il y a beaucoup de cadeaux, et le voile accélérerait avec eux.

**La page s'ouvre toujours en haut.** Toute la mise en scène part du haut de l'écran — le titre
monte depuis le milieu, les cartes se posent l'une après l'autre. Ouverte à mi-page, elle se joue
hors du champ. Or le navigateur restaure la position au rechargement et au retour arrière, et le
voile est `fixed` : rien n'empêchait la page derrière d'être déjà défilée au moment d'appuyer sur
« Ouvrir ». `history.scrollRestoration` passe donc en `manual`, et la position est remise à zéro au
montage puis à l'ouverture — en `instant`, le voile couvrant encore l'écran, un défilement doux
entrerait en concurrence avec l'animation. Jamais depuis l'aperçu de l'éditeur, qui ferait sauter le
formulaire.

**Le texte du voile arrive ligne par ligne**, pas d'un bloc. Tout arrivait ensemble en une seconde —
il n'y avait rien à attendre, et l'invitation à ouvrir était là avant qu'on ait lu à qui la carte
s'adressait. C'est la lecture qui fait monter l'attente, pas un délai arbitraire.

**Le pas entre deux cadeaux dépend de leur nombre.** 420 ms tient la tension à deux ou trois
cadeaux, le cas courant. À dix, la seule cascade durerait 3,8 s, et l'attente cesse d'être une
attente pour devenir une panne. Passé sept cadeaux, le pas se resserre donc pour tenir dans un
écart total de 2,6 s (`revealStep`). Il est posé en style en ligne par `GiftView` : c'est ce qui
garantit que le CSS et le minuteur de la barre de confirmation ne peuvent plus diverger.

**Une carte n'entre que lorsqu'elle est réellement à l'écran.** La cascade partait d'un minuteur :
au-delà de trois ou quatre cadeaux, les suivants montaient derrière la ligne de flottaison et se
posaient bien avant qu'on ait défilé jusqu'à eux. L'animation existait, personne ne la voyait. Un
`IntersectionObserver` la déclenche à l'entrée dans le champ. Le premier lot — les cartes déjà
visibles quand le voile se lève — garde l'échelonnement ; les suivantes entrent sans délai, leur
tour étant venu au moment où on les atteint.

Trois garde-fous s'y rattachent :

- **`is-in` n'est jamais retiré.** Le nettoyage de l'effet l'effaçait ; si l'effet se relançait
  pendant qu'on défilait, les cartes passées au-dessus de l'écran redevenaient invisibles — et le
  restaient, puisqu'elles ne repasseraient plus jamais dans le champ.
- **La dépendance est `page.items.length`, pas `page.items`.** La liste est recréée à chaque rendu
  du parent, et l'aperçu de l'éditeur rend à chaque frappe : observer son identité relançait toute
  la mise en scène entre deux lettres.
- **`is-observee` est posée par le même code.** Sans JavaScript — ou sans `IntersectionObserver` —
  la classe n'arrive jamais, la règle qui masque les cartes ne s'applique pas, et elles restent
  visibles.

**La barre de confirmation suit le dernier cadeau visible**, pas le dernier de la liste. Avec dix
cadeaux dont deux à l'écran, l'attendre au bout de la cascade complète la faisait arriver une
seconde et demie après que tout ce qu'on voit se soit posé.

## Les effets

**Séparés des ouvertures, à dessein.** L'ouverture dit comment le voile se lève ; l'effet, ce qui se
passe derrière. Les deux se combinent librement — un halo peut lâcher des confettis — et un effet
reste utile quand le donneur a coupé le voile.

| effet | rendu |
|---|---|
| **Confettis** | Rectangles colorés qui tombent en tournant. |
| **Pétales** | Ovales dans le ton de la palette, plus lents. |
| **Étincelles** | Elles montent depuis le bas et s'éteignent. |
| **Neige** | Disques pâles, chute droite et posée. |
| **Notes de musique** | Croche isolée et croches liées, qui descendent en se balançant. |
| **Bulles** | Elles montent, grossissent, et éclatent en fin de course. |
| **Feuilles** | Chute lente, avec un tournoiement sur deux axes. |
| **Ballons** | Sept seulement, gros et lents, avec leur ficelle. |
| **Poussière d'or** | Un scintillement sur place, sans chute. |

Comme la palette et le décor, **l'occasion en propose un** : neige pour Noël, confettis pour un
anniversaire, pétales pour la Saint-Valentin, bulles pour une naissance, ballons pour une
crémaillère, poussière d'or pour un mariage. Il suit l'occasion tant que le donneur n'en a pas
choisi un autre.

**Quatre d'entre eux ne se contentent pas d'une variante de la chute**, et c'est ce qui a demandé le
plus de soin :

- **Les notes sont un masque, pas un glyphe.** `content: "♪"` aurait laissé la police de l'appareil
  décider du dessin — une croche fine ici, un pavé carré là, un rectangle vide en cas de manque.
  Le masque porte notre propre tracé, découpé dans un aplat qui suit le thème. Même mécanique pour
  les feuilles et les ballons.
- **Les feuilles tournent en `rotate3d`.** Une feuille qui tombe se retourne, elle ne pivote pas à
  plat comme un confetti, et c'est le passage par la tranche — où elle disparaît presque — qui rend
  la chute crédible.
- **Les ballons sont sept, pas vingt-six.** Vingt-six ballons ne sont pas une fête, c'est un lâcher.
  Le compte est réduit **en CSS** (`:nth-child(4n + 2)`) et non dans le composant, qui sert les dix
  effets et n'a pas à connaître les besoins de chacun.
- **La poussière d'or ne traverse rien.** Tous les autres entrent par un bord et ressortent par
  l'autre ; celle-ci se pose où elle tombe et scintille sur place. D'où `--y`, la hauteur de départ
  que le composant tire pour chaque grain, et trois grains par `<span>` posés en `box-shadow` :
  vingt-six points sur un écran entier, c'est un désert.

Trois règles de fabrication :

- **Une seule salve, jamais une boucle.** Un effet qui tournerait sans fin consommerait la batterie
  pendant tout le temps de lecture, pour un charme qui s'use en trois secondes.
- **Aucun `Math.random` au rendu.** Les positions viennent d'une suite déterministe indexée sur le
  numéro de la particule. Un tirage aléatoire donnerait des valeurs différentes côté serveur et côté
  navigateur, et l'hydratation divergerait à chaque chargement.
- **Seuls `transform` et `opacity` sont animés**, sur 26 `<span>` vides : le compositeur les déplace
  sans repasser par la mise en page ni la peinture. Sous `prefers-reduced-motion`, l'effet n'est pas
  ralenti mais retiré — c'est du décor pur.
- **Le calque est ancré à l'écran, pas au document** (`position: fixed`). En `absolute` il couvrait
  toute la page-cadeau — plus de deux mille pixels avec huit cadeaux — si bien que les étincelles
  partaient de sous le bas du *document* et finissaient leur course avant d'atteindre la fenêtre.
  Mesuré : 0 particule visible sur 26 depuis le haut de la page, contre 26 sur 26 après correction.

Un garde-fou dans `npm run check` exige que **chaque effet du catalogue ait sa règle
`.fx--<id> span {`**. `GiftEffect` pose une classe sur des spans vides et s'arrête là : sans règle,
l'effet est proposable, activable, et absolument invisible.

## La date de révélation

Renseignée, elle scelle la carte : le voile porte un compte à rebours au lieu du bouton, et se
lève tout seul l'heure venue. Tu peux donc envoyer le lien une semaine à l'avance.

Le compte à rebours du navigateur n'est qu'un confort : **`POST /api/…/choose` refuse aussi un
choix envoyé avant la date**. Sans ce second verrou, une requête directe ouvrirait la carte en
avance.

Deux garde-fous à la création : la date doit être au format ISO — `new Date` est si permissif que
« le 25 décembre » devenait 2001-12-24, accepté en silence — et elle doit tomber avant l'expiration
de la page, sans quoi la carte ne s'ouvrirait jamais.

## L'aperçu de la carte

La vue admin et l'écran de fin de création montrent **la feuille telle qu'elle sortira** — le dos
avec son QR à gauche, la couverture à droite, marques de pli comprises — et dessous deux gestes :
**Carte à imprimer** et **Télécharger le QR code** (`components/CardPreview.tsx`).

Il y avait à cette place un damier noir et blanc pleine largeur. Il ne disait rien de ce qu'on va
tenir dans la main : ni le prénom, ni le thème, ni même qu'il existe une carte derrière — et le
bouton « Carte à imprimer » vivait dessous, dans une rangée séparée où personne ne faisait le lien
entre les deux.

L'écran de fin portait, lui, **l'atelier complet déplié** : carrousel, champs de texte, feuille
pleine largeur. Bonne intention, mauvais format — sur un écran où l'on vient chercher deux liens, il
prenait plus de place que les liens et repoussait les boutons hors de vue.

La vignette est bornée à 15 rem et la colonne d'actions à 22 rem : sans plafond les deux boutons
s'étiraient sur près de 700 px, et une pilule de cette longueur pour trois mots ne ressemble plus à
un bouton. Sous 32 rem, la carte repasse au-dessus et les boutons en dessous.

Le QR est **généré dans le navigateur**, à partir d'une URL que le client possède déjà — pas
d'aller-retour serveur pour ça — en SVG, net à n'importe quelle taille d'impression, et
téléchargeable pour qui veut seulement le coller ailleurs.

## L'aperçu

Deux aperçus, un seul composant — `GiftView` sert à la fois la page réelle et les deux aperçus,
donc aucun ne peut mentir.

- **L'aperçu plein écran** repart toujours du début, voile compris : il ne sert pas à régler mais à
  voir ce que la personne recevra, et elle commence par le voile. L'aperçu en direct, lui, suit le
  cadre qu'on règle — régler le titre de l'écran des cadeaux en voyant le voile serait travailler à
  l'aveugle. Faire l'un comme l'autre sautait l'ouverture dès qu'on avait touché au cadre
  « Cadeaux ».
- **L'aperçu en direct**, à l'étape « La présentation » : une réduction du rendu réel, qui réagit
  à chaque réglage. **Au-delà de 62 rem seulement** — voir « L'assistant de composition ».
  Colonne collante à partir de 62 rem, bandeau en haut de l'étape en dessous. Il est mis à l'échelle
  par `transform: scale()` — ce qui crée au passage un bloc englobant, si bien que la barre de
  confirmation et le voile, en `position: fixed`, restent enfermés dans le cadre au lieu de
  s'échapper sur toute la fenêtre.

  Attention si vous y touchez : **`vw` et les media queries s'y mesurent sur la vraie fenêtre**, pas
  sur le cadre. Les tailles en `clamp(… vw …)` y devenaient énormes ; `.gift-root--embedded` fige
  donc les valeurs que ces clamps prendraient à 390 px.
- **L'aperçu plein écran**, accessible depuis n'importe quelle étape.

## La marque, le favicon et la bannière

`npm run brand` fabrique tout à partir d'une seule description géométrique, en tête de
`scripts/brand.mjs` : le SVG en est écrit, et le rasteriseur redessine exactement les mêmes formes.
Deux fichiers dessinés à la main auraient dérivé l'un de l'autre au premier ajustement. Les
fichiers produits sont versionnés — le build ne les régénère pas.

| fichier | pour qui |
|---|---|
| `app/icon.svg` | les navigateurs récents, net à toute taille |
| `app/favicon.ico` | 16, 32 et 48 px — Bing et les clients qui vont chercher `/favicon.ico` sans lire le `<link>` |
| `app/apple-icon.png` | iOS, 180 px, carré plein (le système arrondit lui-même) |
| `public/icon-192.png`, `public/icon-512.png` | le manifeste, et Google, qui veut un carré multiple de 48 |
| `public/icon-maskable-512.png` | Android, qui rogne jusqu'à 20 % de chaque bord |

Le `.ico` embarque des bitmaps bruts et non des PNG : il n'existe justement que pour les clients
anciens, et leur servir un format qu'ils pourraient ne pas décoder le viderait de son intérêt.

Le dessin — un paquet cadeau, couvercle et nœud — est dimensionné pour tenir à **16 px**, la taille
réelle d'un favicon dans un onglet. D'où des boucles pleines plutôt qu'évidées : un trou d'un pixel
n'aurait fait que salir la forme. Une première version en plein cadre, deux rubans qui se croisent,
a été abandonnée : réduite, elle se lisait comme une croix.

**La bannière** (`app/opengraph-image.tsx`) est ce que montrent Google, Bing et les messageries
quand on colle un lien du site. Elle est fabriquée à la construction, pas à la volée : rien n'y
dépend de la requête. Les polices viennent de Google Fonts en TTF — annoncé comme un vieux client,
le service renvoie du TTF au lieu du WOFF2, seul format que sache lire le moteur de rendu. Si la
récupération échoue, l'image se compose avec la police intégrée plutôt que de ne pas exister.

Les pages-cadeau, elles, gardent leur propre aperçu, composé à partir de l'image du premier cadeau
(voir `app/[slug]/page.tsx`). Une carte sans aucune image retombe sur la bannière du site.

## Les routes anonymes et leurs quotas

Aucun compte, aucun paiement, aucune adresse : rien n'identifie qui appelle l'API. Les routes
ouvertes coûtent pourtant — une ligne en base, des images stockées trente jours, des requêtes
sortantes. `lib/rateLimit.ts` leur pose un quota par adresse.

| route | quota | pourquoi ce seuil |
|---|---|---|
| `POST /api/pages` | 10 / 10 min | la plus coûteuse : insertion, recopie d'images, stockage |
| — plafond global | 100 / 10 min | tient même si l'abus est réparti sur beaucoup d'adresses |
| `POST /api/upload` | 30 / 10 min | plusieurs images par carte, donc plus permissif |
| `POST /api/extract` | 40 / 10 min | fait sortir une requête vers une URL fournie par un inconnu |
| `choose` et `reply` | 30 / 10 min | verrouillées métier, mais énumérables |
| `PATCH`/`DELETE` admin | 60 / 10 min | le jeton est déjà infalsifiable ; évite le martèlement |

**Seau à jetons, pas fenêtre fixe.** Une fenêtre fixe laisse passer deux fois le quota à cheval sur
sa frontière, puis repart brutalement à zéro. Ici le crédit se reconstitue en continu : une rafale
courte passe, la moyenne tient. Refuser ne recharge pas le compteur — sinon marteler la route
repousserait indéfiniment le moment où le crédit revient.

**Le quota passe avant tout le reste** dans chaque handler : avant la validation, avant la lecture
du corps, avant la base. Refuser doit coûter moins cher que servir.

**La table des compteurs est bornée** (20 000 entrées). Sans ce plafond, elle serait elle-même un
vecteur : il suffirait de faire tourner l'adresse source pour la faire enfler sans fin. Le balayage
jette d'abord les compteurs revenus à plein — ils ne disent rien qu'un compteur neuf ne dirait —
puis les plus anciens, jamais les plus actifs.

Ce que ça n'est pas, en toute franchise :

- **Le compte est par instance.** Deux instances derrière un répartiteur doublent le quota réel.
  Acceptable ici : les seuils sont larges pour un usage normal, serrés pour un abus.
- **Un redémarrage remet tout à zéro.** C'est aussi pourquoi le plafond global existe.
- **`x-forwarded-for` est falsifiable** si rien ne le réécrit. Le code suppose l'application servie
  **derrière le proxy de l'hébergeur**, qui pose l'en-tête lui-même ; les en-têtes propres à une
  plateforme (`cf-connecting-ip`, `x-vercel-forwarded-for`, `x-real-ip`) passent en premier.
  Exposer le serveur Node directement à Internet rendrait la limitation contournable d'un en-tête.
- **Ça ne remplace pas un captcha** le jour où l'abus devient ciblé plutôt qu'opportuniste.

En développement il n'y a pas de proxy : toutes les requêtes locales partagent le compteur
`sans-adresse`, et dix créations d'affilée suffisent à se bloquer soi-même. `RATE_LIMIT_DISABLED=1`
dans `.env.local` coupe le mécanisme — jamais en production.

**Le pire scénario n'est pas le contournement, c'est le partage.** Déployé derrière un hébergeur qui
ne pose aucun de ces en-têtes, tout le trafic tombe dans le même compteur `sans-adresse` : dix
créations toutes personnes confondues, et le site refuse tout le monde. C'est un blocage silencieux
et total, bien plus visible qu'un abus passé au travers. **À vérifier une fois déployé** — créer
deux cartes de suite depuis deux réseaux différents suffit à savoir.

## Être trouvé sur Google

Une page-cadeau ne doit jamais être indexée — c'est du courrier privé. Ce qui doit l'être, c'est
l'outil : l'accueil, le formulaire, et surtout `/questions`.

**Ce qui est en place**

- `robots.txt` et `sitemap.xml` générés depuis `NEXT_PUBLIC_BASE_URL`. Le sitemap ne liste que les
  six pages publiques ; y inscrire les cartes reviendrait à publier la liste des liens envoyés.
- **Une adresse canonique par page** (`alternates.canonical`), pour qu'une même page atteinte par
  deux chemins ne se fasse pas concurrence à elle-même.
- **Des titres qui portent ce qu'on cherche, pas ce qu'on est.** « Givly — offre le choix » ne se
  trouve qu'en tapant « Givly », c'est-à-dire en connaissant déjà le site. L'accueil annonce donc
  « Offrir en laissant choisir le cadeau ». Tous les titres tiennent sous 60 signes, toutes les
  descriptions sous 160 — au-delà, Google coupe.
- **Données structurées** : `WebApplication` sur l'accueil, avec un `offers` à zéro qui est la façon
  normalisée de dire « gratuit » ; `FAQPage` sur `/questions`.
- **Les pages légales sont liées depuis le pied de page.** Une page seulement déclarée dans le
  sitemap, sans lien depuis une page indexée, n'existe pour aucun moteur.
- `/questions` **est l'actif principal.** Ses réponses emploient les mots que les gens tapent —
  « offrir un cadeau au choix », « laisser choisir son cadeau » — plutôt que le vocabulaire interne
  du projet. Le texte affiché et le balisage `FAQPage` sont produits par le même tableau : Google
  exige qu'ils coïncident, et deux listes tenues en parallèle auraient divergé.

**Ce qu'il ne faut pas en attendre**

- **Le balisage `FAQPage` n'affichera pas d'accordéon dans les résultats.** Depuis 2023, Google
  réserve ce résultat enrichi aux sites gouvernementaux et de santé. Il reste utile à la
  compréhension de la page, mais ce sont les réponses elles-mêmes qui feront venir du monde.
- **Rien de tout ceci ne crée de la notoriété.** Un site sans liens entrants met des mois à sortir
  sur des requêtes disputées. Le référencement technique enlève les obstacles ; il ne remplace pas
  le fait d'être cité ailleurs.
- **`NEXT_PUBLIC_BASE_URL` doit être juste au build**, sinon le sitemap et les adresses canoniques
  pointent vers `localhost` — et tout ce qui précède ne sert à rien.

**À faire une fois en ligne** : déclarer le site dans Google Search Console et Bing Webmaster Tools,
et y soumettre le sitemap. Sans cela, l'indexation peut prendre des semaines.

## Les mentions légales

`lib/site.ts` rassemble l'identité de l'éditeur : nom, adresse, contact, hébergeur. Les pages
`/mentions-legales`, `/confidentialite` et `/contact` la lisent toutes.

**Les valeurs livrées sont des espaces réservés.** Une mention légale engage celui qui la publie :
elle doit porter une identité réelle, et personne d'autre que lui ne peut la renseigner. Tant
qu'un champ vaut `À REMPLIR`, la page l'affiche en rouge comme manquant plutôt que d'inventer —
un trou visible vaut mieux qu'une fausse déclaration.

Le champ `statut` (`particulier` ou `societe`) commande les mentions supplémentaires : numéro
d'entreprise et TVA n'apparaissent que pour une société.

## Déployer

L'application ne dépend d'aucun hébergeur en particulier.

| variable | rôle |
|---|---|
| `POSTGRES_URL` | chaîne de connexion Postgres |
| `POSTGRES_URL_NON_POOLING` | connexion directe pour la migration ; souvent la même |
| `NEXT_PUBLIC_BASE_URL` | base absolue des liens, QR codes et balises Open Graph |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob ; absent, les images vont dans `.media/` |
| `FREE_PAGE_TTL_DAYS` | durée de vie d'une page gratuite (défaut : 30) |

Deux pièges, tous deux silencieux :

**`NEXT_PUBLIC_BASE_URL` doit exister dès la phase de build.** Le préfixe
`NEXT_PUBLIC_` fait que Next inline la valeur à ce moment-là. Absente, elle retombe
sur `http://localhost:3000` et **tous les liens distribués pointent vers localhost** —
le site a l'air de marcher et donne des liens morts.

**Le schéma s'applique au démarrage.** `npm start` lance `scripts/boot.mjs` avant Next :
`db/schema.sql` est idempotent, le rejouer à chaque démarrage ne coûte rien et évite
d'avoir à lancer une migration à la main depuis son poste — ce qui, sur Railway,
supposerait d'exposer la base publiquement.

L'étape ne bloque jamais le démarrage : base injoignable, l'application se lance quand
même et répond 503 avec un message explicite. Refuser de démarrer ferait boucler
l'hébergeur sans rien expliquer.

`npm run db:migrate` reste disponible pour l'appliquer manuellement.

**Les images.** Il faut choisir l'une des deux, et le choix n'est pas optionnel en
production : sans lui, les images sont écrites sur le disque du conteneur et
**disparaissent au déploiement suivant, y compris sur les cartes déjà envoyées**.
L'envoi réussit, la carte s'affiche, et la perte n'apparaît qu'au déploiement
d'après — c'est un piège entièrement silencieux, et il s'est refermé une fois.

1. **`BLOB_READ_WRITE_TOKEN`** : les images partent sur Vercel Blob, servies par
   un CDN. Le service s'utilise depuis n'importe quel hébergeur, sans y déployer
   quoi que ce soit. Rien à gérer ensuite.
2. **Un volume persistant**, désigné par **`MEDIA_DIR`**. Le chemin doit être
   exactement le point de montage : sur Railway, un volume monté sur
   `/app/.media` se déclare `MEDIA_DIR=/app/.media`. Sans cette variable, le code
   écrit à côté du code, donc hors du volume — et le piège se referme.

   Attention : un volume appartient à **un service**. Celui de la base de données
   ne protège que la base ; il en faut un sur le service applicatif.

Le démarrage annonce le chemin retenu et vérifie qu'il est accessible en écriture,
pour qu'un montage posé à côté se voie tout de suite :

```
[givly] Images : dossier /app/.media.
```

## L'assistant de composition

Création et édition passent par le même composant, en trois étapes :

1. **L'occasion** — seize presets en quatre rubriques. Rien à valider : voir « L'occasion ».
2. **Les cadeaux** — de 1 à 10 propositions, avec extraction depuis une URL ou saisie manuelle. Le
   minimum est bien **un** : voir « Le cadeau unique ».
3. **La présentation** — un cadre par écran que traverse la personne qui reçoit (**Intro**,
   **Cadeaux**, **Choix**), puis le thème et le lien. Avec un aperçu en direct à côté des réglages,
   sur écran large.

Un brouillon écrit du temps des deux étapes porte un numéro qui ne veut plus dire la même chose :
son `2` désignait la présentation, devenue la troisième. `lireBrouillon` le fait retomber sur les
cadeaux plutôt que de le promouvoir — mieux vaut revoir une étape déjà remplie que d'en sauter une
qui ne l'est pas.

**L'aperçu en direct n'existe qu'au-delà de 62 rem.** Son cadre mesure 300 × 525 px pour une
page-cadeau réduite à la même hauteur : au téléphone, en colonne unique, il n'en montrait qu'une
tranche coupée en haut comme en bas, et s'installait avant les réglages — le formulaire commençait
donc sous la ligne de flottaison. Il est masqué en dessous, et le bouton **Aperçu** de la barre
d'action ouvre le même rendu en plein écran, là où il a la place d'être lisible. Le masquage est en
CSS et non en JavaScript : lire la largeur de la fenêtre pendant le rendu ferait diverger
l'hydratation.

**L'ordre d'une ligne de cadeau change avec la largeur.** Elle est faite de trois zones nommées —
`source`, `preview`, `fields` — placées par `grid-template-areas` et non par l'ordre du DOM. En
colonne unique, l'adresse du produit passe **avant** la vignette : c'est le geste qui remplit tout
le reste, il n'a pas à attendre derrière un cadre de collage vide. Ce cadre se réduit d'ailleurs à
une bande tant qu'aucune image n'y est tombée, pour ne pas repousser le titre hors de l'écran. Au
large, la vignette reprend sa colonne à gauche et enjambe les deux rangées.

**« La carte » n'a pas survécu comme étape.** Elle ne portait que deux champs : le nom interne et le
prénom du receveur. Le prénom a rejoint le cadre **Intro**, là où il s'affiche ; le nom a rejoint le
cadre **Lien**, puisque c'est lui qui fabrique l'adresse. Celle-ci en découle sans réglage :
personne ne s'en soucie, et le serveur résout tout seul une collision en ajoutant `-2`, `-3`…

Chaque étape ne valide que ses propres champs, pour ne pas bloquer sur une étape qu'on n'a pas
encore atteinte. À l'enregistrement, tout est revalidé et une erreur en amont **ramène sur l'étape
concernée** — sinon le message parlerait d'un champ invisible. L'aperçu reste accessible partout.

En création, l'assistant avance pas à pas. En édition tout est déverrouillé : on saute d'une étape
à l'autre par les puces du haut, et le bouton d'enregistrement est présent sur chacune.

## Modèle économique

**Rien n'est décidé, et rien n'est implémenté.** Cette section existe pour que l'analyse ne se
reperde pas, pas pour acter un choix.

La piste étudiée est l'**affiliation** : le donneur colle des liens produit, un achat s'ensuit,
une commission tombe. Trois réserves, par ordre de gravité.

**Le volume est structurellement minuscule.** Une page-cadeau, c'est **un** acheteur. Pas mille
visiteurs dont 2 % convertissent : une personne, dont la conversion est presque certaine mais dont
la base est 1. *Estimation, hypothèses explicites* — panier de 45 €, commission moyenne 4,5 %
(Amazon FR : 3-4 % high-tech, 6-7 % maison/beauté), 70 % des pages aboutissant à un achat traçable
— soit **≈ 1,40 € par page créée**, et **~7 000 pages/an** pour 10 000 € de revenu. La question
n'est donc pas « quel taux ? » mais « peut-on faire 7 000 pages ? ».

**Récrire les liens collés par le donneur est une zone grise.** L'injection d'un tag dans une URL
que l'utilisateur a fournie n'est pas explicitement traitée par l'*Associates Operating Agreement*
d'Amazon ; ce qui l'est : l'injection de tags sans intention de clic authentique, le cookie
stuffing, les redirections forcées, avec fermeture de compte annoncée pour toute violation
« however minor ». **À vérifier auprès d'Amazon avant de construire dessus** — le coût d'une erreur
est la perte du canal entier.

**Le cookie de 24 h contre un parcours asynchrone.** Le cookie Amazon dure 24 h (90 jours si le
produit part au panier), or Givly est asynchrone par construction : création, envoi, choix du
receveur des jours plus tard, achat après. Contrainte de conception qui en découle : **le lien
d'achat final doit être servi par Givly** depuis l'écran d'administration, pas copié-collé.

**Ce que l'affiliation impliquerait sur le produit.** Givly repose sur un renversement : *c'est le
donneur qui propose, pas le receveur qui demande*. Si Givly propose les cadeaux, la prémisse devient
« Givly me dit quoi offrir », et l'on entre frontalement sur le marché des sites d'idées cadeaux.
Les listes multi-enseignes gratuites existent déjà en France — The Good List, Listy, MyLittleWishList,
Milirose — et ce qui distingue Givly n'est pas la liste, c'est le renversement et la mise en scène.

**L'ordre à suivre, si la question revient :**

1. **Instrumenter avant de construire.** Trois chiffres manquent : pages créées, choix confirmés,
   clics vers la boutique depuis l'admin. Sans eux, tout calcul de revenu est de la fiction — y
   compris celui ci-dessus.
2. **Des suggestions complémentaires, jamais substitutives.** Le donneur a mis deux cadeaux →
   « trois idées de plus pour un anniversaire », qu'il *ajoute* s'il veut. L'affiliation devient
   propre — notre lien, notre produit, pas de récriture — et la prémisse du produit reste intacte.
3. **Regarder un modèle qui ne dépend pas d'un tiers qui peut bannir.** La carte à imprimer est déjà
   une valeur réelle. *Spéculation, à valider* : une carte imprimée et postée se vend au moment où
   le donneur est le plus engagé, sans cookie et sans compte à faire fermer.

**Le seul changement déjà fait au titre de cette réflexion** est le déplacement de l'occasion avant
les cadeaux (voir « Ce qui est personnalisable »). Il est bon en soi, et n'engage rien.

## Décisions structurantes

**Les images sont recopiées, jamais hotlinkées.** Qu'elle vienne de l'extraction OG, d'une URL
collée ou d'un téléversement, chaque image est rapatriée dans Vercel Blob. Une page doit rester
intacte 30 jours ; hotlinker l'image d'un marchand la casse dès qu'il touche à son site. Si la
copie échoue (403, lien mort, format refusé), l'URL d'origine est conservée en dernier recours et
l'UI le signale — la création n'est jamais bloquée pour autant.

**L'extraction essaie cinq pistes, dans cet ordre.** Avant tout, l'URL est nettoyée
(`canonicaliseUrl`) : les paramètres de pistage sautent, et une fiche Amazon est réduite à
`/dp/<ASIN>`. Puis :

1. **Cas Amazon** — Amazon ne sert *ni* Open Graph *ni* JSON-LD sur ses fiches produit. Sans ce cas
   particulier, l'heuristique générique remonte une bannière promotionnelle. On lit `#productTitle`,
   puis l'image via `data-old-hires`, `hiRes`, ou la carte `data-a-dynamic-image`.
2. **Open Graph / Twitter Card** — le cas courant (WooCommerce, Shopify, WordPress…).
3. **JSON-LD `Product`** — beaucoup de boutiques n'ont que ça. Le parseur descend dans `@graph`
   et accepte `image` en chaîne, tableau ou objet `{ url }`.
4. **`<link rel="image_src">`**.
5. **Repli `<img>`** — la plus grande image plausible, en écartant logos, bannières, badges de
   paiement et pixels de suivi.

Le titre est ensuite nettoyé : le nom du site en suffixe (« … – Lola Troisfontaines », « … :
Amazon.com.be ») est retiré, et la coupe se fait sur un mot entier dans la limite du champ.

**Les images ne sont jamais rognées.** Les photos produit ont des proportions imprévisibles : une
fiche Amazon fait souvent 1500×1045, une photo de boutique est carrée. Dans une vignette 4/3, un
recadrage `cover` coupait 25 % d'une image carrée — de quoi amputer l'objet offert. Les cartes
affichent donc l'image entière (`contain`), sur une copie floutée et débordante d'elle-même qui
remplit le cadre sans rien couper.

**Une image se colle, elle ne se téléverse pas forcément.** Sur chaque ligne de cadeau, `Ctrl+V`
accepte une capture d'écran, une image copiée depuis une page marchande, ou un fichier copié dans
l'explorateur — que le curseur soit dans un champ ou sur la vignette. Coller une simple adresse
d'image sur la vignette remplit le champ Image. Un collage de texte dans un champ de saisie n'est
jamais détourné. L'image passe par `/api/upload` comme un téléversement : il faut bien une URL en
base, on ne stocke pas de `data:` URI — donc `BLOB_READ_WRITE_TOKEN` est requis pour cette voie.

**Le repli manuel est un chemin nominal.** Quand rien ne sort, l'API renvoie `{ ok: false, reason }`
et l'UI affiche un message adapté à la cause (`login_required`, `blocked`, `unreachable`,
`not_html`, `no_image`) plutôt qu'un échec générique. Jamais de blocage.

**Le verrouillage se fait au choix confirmé, pas au premier affichage.** Une page seulement ouverte
reste modifiable jusqu'à son expiration. `chosen_at` non nul fige la page : plus d'édition, plus de
second choix ; seule la suppression reste possible. Le garde est posé en SQL
(`WHERE ... AND chosen_at IS NULL`), donc deux confirmations simultanées ne peuvent pas gagner
toutes les deux.

**`view_count` ne compte que les pages actives.** Ni les affichages d'une page expirée, ni ceux
d'une page déjà choisie : le compteur mesure l'attente d'un choix, pas le trafic.

Il est incrémenté et transmis à la vue admin, mais **plus affiché nulle part** depuis que celle-ci a
été allégée : le nombre de consultations disait peu de chose et encombrait ce qu'on vient vraiment
y chercher. La colonne et la règle de comptage restent en place — c'est de la donnée dormante,
pas une fonctionnalité vivante.

**Le slug et l'`admin_token` ne changent jamais.** Un lien déjà envoyé continue de fonctionner après
n'importe quelle édition.

## Hors périmètre (volontairement non implémenté)

- **Paiement / paywall.** La colonne `plan` existe (`free` | `paid`), mais rien ne produit encore
  une page `paid` et aucun flux Stripe n'est branché. Tout est traité comme `free`.
- **Comptes utilisateurs.** L'accès admin repose uniquement sur le token secret dans l'URL.
- **Navigateur headless.** L'extraction se limite à `fetch` + parsing HTML.
- **Notification du choix.** Le donneur découvre le choix en rouvrant son lien admin.
- **Collecte d'adresse ou d'infos du receveur.** Il ne saisit que son choix.
- **Multi-devise et i18n.**
- **Paywall.** L'ordre choisi est : étoffer d'abord les options de personnalisation, puis décider
  lesquelles passent derrière le paiement. Aucune option n'est aujourd'hui marquée payante, et
  l'assistant n'affiche rien à ce sujet — mieux vaut ne rien annoncer que d'annoncer des cases
  inertes. La colonne `plan` reste en place pour le jour où.

## Limites connues

- **La limitation de débit se compte par instance et ne survit pas au redémarrage.** Voir la
  section dédiée : c'est un choix assumé, pas un oubli. Un abus vraiment ciblé demandera un
  captcha, que rien ne prépare aujourd'hui.
- **Aucun test ne touche une route, une base ou un navigateur.** `npm run check` ne vérifie que de
  la logique pure — validation, slugs, extraction, quotas, réduction d'images. Les handlers HTTP,
  les requêtes SQL et le rendu ne sont couverts par rien d'automatisé : ils se vérifient à la main.
  C'est la lacune la plus large du projet.
- **Les fichiers de la marque sont du produit de build versionné.** `npm run brand` les régénère,
  mais rien n'oblige à le lancer : modifier la géométrie dans `scripts/brand.mjs` sans régénérer
  laisse le favicon et les icônes en désaccord avec leur source, et aucune vérification ne le
  signalera.
- **Le slug public est devinable.** Ne rien mettre de sensible dans une page-cadeau.
- **Le mot du receveur n'est plus lié à l'auteur du choix.** Il part dans une seconde requête ; qui
  détient le lien peut donc l'écrire à sa place, tant que la carte n'en porte pas déjà un et que
  l'heure qui suit le choix n'est pas écoulée. C'est le prix du bouton « Laisser un mot » posé après
  la confirmation, et le même modèle de confiance que le choix lui-même : le lien fait foi.
- **`admin_token` est la seule protection admin.** 32 octets aléatoires, transmis dans l'URL :
  qui a le lien a les droits.
- **`/api/extract` fait des requêtes sortantes depuis le serveur** vers une URL fournie par un
  visiteur anonyme. Les hôtes internes évidents (localhost, plages privées) sont filtrés sans
  résolution DNS : cela couvre les cas courants, pas un attaquant déterminé.
- **L'extraction dépend de l'adresse IP qui l'exécute.** Amazon et Facebook répondent depuis une
  connexion domestique, mais bloquent couramment les plages d'hébergeurs. Ce qui marche en local
  peut renvoyer `blocked` une fois déployé sur Vercel. Le repli manuel reste la garantie ; c'est
  aussi pour ça qu'il n'est pas traité comme un cas d'erreur.
- **Certaines images sont signées et expirent.** Une photo de profil Facebook arrive avec un
  paramètre `oe=` qui périme en quelques jours. La recopie vers Vercel Blob n'est donc pas un
  confort mais une nécessité : sans `BLOB_READ_WRITE_TOKEN`, ces images casseront.
