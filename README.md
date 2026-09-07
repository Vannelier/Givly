# Givly

Composer une petite page-cadeau, envoyer un lien, laisser la personne choisir.

Le donneur rassemble 2 à 10 propositions (produits de n'importe quel marchand, activités),
obtient un lien public et un lien d'administration secret. Le receveur ouvre le lien, choisit,
confirme. Le donneur retrouve le choix dans sa vue admin, puis commande lui-même.

**Aucun paiement ne transite par la plateforme. Aucune adresse n'est collectée.**

---

## Stack

- Next.js 15 (App Router, TypeScript)
- Postgres via le pilote `pg` — table unique `gift_pages`, n'importe quel
  hébergeur convient (Railway, Neon, Supabase, local)
- Vercel Blob — toutes les images d'items y sont recopiées
- `node-html-parser` pour lire les métadonnées Open Graph (pas de navigateur headless)
- `qrcode` pour le QR code du lien public

## Mise en route

### 1. Provisionner les services

Depuis le dashboard Vercel du projet : ajouter l'intégration **Postgres** et l'intégration **Blob**.
Elles injectent `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL` et
`BLOB_READ_WRITE_TOKEN`. Ne pas coder ces valeurs en dur.

### 2. Variables d'environnement

Copier `.env.example` vers `.env.local`, puis récupérer les valeurs Vercel :

```bash
npx vercel env pull .env.local
```

| variable | rôle |
|---|---|
| `POSTGRES_URL` | connexion poolée (lecture/écriture applicative) |
| `POSTGRES_URL_NON_POOLING` | connexion directe, utilisée par la migration |
| `POSTGRES_PRISMA_URL` | fournie par Vercel, non utilisée ici |
| `BLOB_READ_WRITE_TOKEN` | écriture Vercel Blob |
| `NEXT_PUBLIC_BASE_URL` | base absolue des liens et des balises Open Graph |
| `FREE_PAGE_TTL_DAYS` | durée de vie d'une page gratuite (défaut : 30) |

### 3. Créer le schéma

```bash
npm run db:migrate
```

Ajouter `-- --seed` pour insérer une page de démonstration (`/pour-toi-demo`).
Le script est idempotent : le rejouer ne casse rien.

### 4. Lancer

```bash
npm run dev
```

> Il n'y a pas de mode « sans base ». `@vercel/postgres` parle à Neon, pas à un Postgres local :
> le développement se fait contre la base Vercel/Neon du projet, ce qui est le flux Vercel normal.
> Sans `POSTGRES_URL`, les routes répondent 503 avec un message explicite ; le formulaire de
> création et l'aperçu, eux, fonctionnent quand même.

## Scripts

| commande | effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run check` | vérifications de la logique pure (validation, slugs, extraction, expiration) — aucune base requise |
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
| `app/creer/page.tsx` | assistant de création, en deux étapes |
| `app/[slug]/page.tsx` | page-cadeau publique (SSR + `generateMetadata` pour l'aperçu de lien) |
| `app/admin/[token]/page.tsx` | vue admin : état, choix, `view_count`, édition, suppression |
| `components/GiftView.tsx` | le rendu que voit le receveur — **le même** composant sert à l'aperçu |
| `components/editor/PageEditor.tsx` | assistant partagé création / édition |
| `lib/palettes.ts` | les huit palettes ; seul leur identifiant est stocké |
| `lib/occasions.ts` | occasions et polices ; idem, seuls les identifiants sont stockés |
| `components/GiftMotif.tsx` | décors SVG des occasions |
| `components/GiftCover.tsx` | voile d'ouverture et compte à rebours |
| `components/QrCard.tsx` | QR code du lien public |
| `scripts/brand.mjs` | fabrique la marque : `app/icon.svg`, `app/favicon.ico`, les PNG |
| `app/opengraph-image.tsx` | la bannière de partage du site (1200 × 630) |
| `components/PrintableCard.tsx` | carte A6 à imprimer, aux couleurs du thème |
| `lib/mediaStore.ts` | où atterrissent les images : Vercel Blob, ou disque en développement |
| `lib/extract.ts` | lecture des métadonnées OG, best-effort |
| `lib/blob.ts` | recopie des images vers Vercel Blob |
| `lib/validation.ts` | validation des entrées, avant toute écriture |
| `lib/db.ts` | **seul** point de contact avec Postgres (pilote `pg`, gabarit paramétré) |

### Pages

| route | rôle |
|---|---|
| `/` | accueil — invite à composer |
| `/creer` | formulaire de création |
| `/[slug]` | page-cadeau publique |
| `/admin/[token]` | vue admin |

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
| `POST /api/extract` | `{ url }` → `{ ok, title?, image?, siteName? }`. Ne jette jamais. |
| `POST /api/upload` | image (repli manuel) → Vercel Blob → `{ url }` |
| `POST /api/pages` | crée la page (aucun champ de texte obligatoire) → `{ slug, publicUrl, adminUrl, expiresAt, warnings }` |
| `PATCH /api/admin/[token]` | édite la page ; 409 si verrouillée ou expirée |
| `DELETE /api/admin/[token]` | supprime la page |
| `POST /api/pages/[slug]/choose` | `{ itemId }` → enregistre le choix et verrouille |
| `POST /api/pages/[slug]/reply` | `{ reply }` → attache le mot du receveur, après le choix ; 409 hors fenêtre ou si un mot existe déjà |

## Ce qui est personnalisable

L'assistant tient en **deux étapes** : les cadeaux, puis la présentation. Cette seconde étape est
découpée en cadres qui suivent, dans l'ordre, les trois écrans que traverse la personne qui reçoit —
**Intro**, **Cadeaux**, **Choix** — précédés de l'occasion et suivis du thème et du lien.

| réglage | cadre | effet |
|---|---|---|
| **Occasion** | Occasion | Preset complet : palette, décor et formulations de départ d'un coup. Quinze occasions, rangées par rubrique. |
| **Prénom** | Intro | « Pour Sophie », tout en haut du voile. |
| **Mot d'ouverture** | Intro | La ligne au-dessus du titre. Vide = celle de l'occasion. |
| **Message principal** | Intro | Le grand titre du voile, et le titre de l'aperçu de lien. |
| **Texte du bouton** | Intro | Le bouton qui lève le voile. Vide = la suggestion de l'occasion (« Ouvrir », « Ouvrir mon cadeau »…). |
| **Ouverture** | Intro | Le voile à lever, en trois styles : voile, rideau, enveloppe. Désactivable. |
| **Date de révélation** | Intro | Avant elle, la carte reste scellée sur un compte à rebours. |
| **Mot d'attente** | Intro | Sous le compte à rebours, tant que la carte est scellée. Vide = la suggestion de l'occasion. |
| **Photo d'en-tête** | Intro | Une photo large en haut de la carte. |
| **Titre** | Cadeaux | Au-dessus des cadeaux. Vide = « À toi de choisir ». |
| **Contenu** | Cadeaux | La ligne sous ce titre. Vide = « Choisis celui qui te fait le plus envie. » |
| **Signature** | Cadeaux | Une ligne en bas de page. Facultative. |
| **Message de fin** | Choix | Après la confirmation du choix. |
| **Mot du receveur** | Choix | Un bouton, sur l'écran de confirmation, qui ouvre la saisie. Désactivé par défaut. |
| **Palette** | Thème | Huit palettes. Réglée par l'occasion, modifiable ensuite. |
| **Police du titre** | Thème | Sept : Élégant, Classique, Délicat, Net, Rond, Manuscrit, Calligraphie. |
| **Disposition** | Thème | Grille ou liste. |
| **Décor** | Thème | Le motif de l'occasion, désactivable. |
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

**Une occasion est un preset, pas une contrainte.** La choisir repose palette et décor, et met à jour
le mot d'ouverture — mais uniquement s'il était encore celui de l'occasion précédente. Un texte
écrit à la main n'est jamais écrasé.

Les suggestions du titre et du contenu de l'écran des cadeaux, elles, sont **communes à toutes les
occasions** (`ITEMS_TITLE_HINT`, `ITEMS_MESSAGE_HINT`) : cet écran est fonctionnel, le décorum de
l'occasion vit sur le voile juste avant.

**Le décor est un SVG en `currentColor`**, pas une image : il suit la palette sans code de couleur
en dur, ne coûte aucun téléchargement, et se désactive en une case à cocher. Il n'apparaît que pour
les occasions qui en proposent un.

**En base, seuls les identifiants sont stockés** (`theme.occasion`, `theme.palette.id`,
`theme.font`). Les couleurs et les motifs vivent dans `lib/palettes.ts` et `lib/occasions.ts` :
retoucher un thème met à jour toutes les pages déjà créées, et un identifiant inconnu retombe
proprement sur la valeur par défaut. Rien d'autre qu'un identifiant connu n'est accepté du client.

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

`/admin/[token]/imprimer` : une carte A6 aux couleurs du thème, avec le QR code, le prénom, le mot
d'ouverture, le titre et la signature. Tout est dessiné en CSS et en SVG — rien à télécharger, et
l'impression sort nette à n'importe quelle taille.

Les commandes disparaissent à l'impression ; `print-color-adjust: exact` force le navigateur à
imprimer les aplats de couleur, qu'il supprime par défaut.

## L'ouverture de la carte

Le receveur ne tombe pas directement sur les cadeaux. Un voile se pose au-dessus, portant le
message d'ouverture et le titre, avec un bouton **Ouvrir**. Il se lève d'un geste, et les cartes
entrent en cascade.

Le voile est **opaque**. Un premier essai le laissait translucide et flouté, pour deviner les
cadeaux derrière — mais le titre de la page transparaissait sous celui du voile, et on lisait le
même texte en double. Cacher franchement rend aussi l'ouverture plus spectaculaire, surtout en
rideau et en enveloppe. Il porte son propre décor, puisqu'il masque celui de la page.

Son fond est peint par deux panneaux et non par le voile lui-même : c'est ce qui permet au style
« rideau » de les écarter chacun de son côté.

Il est désactivable (« Ouvrir la carte d'un geste »), et il ne s'affiche jamais sur une page déjà
choisie ou expirée : dans ces cas, l'état doit être visible tout de suite. Sous
`prefers-reduced-motion`, le voile reste mais s'efface sans animation.

## La date de révélation

Renseignée, elle scelle la carte : le voile porte un compte à rebours au lieu du bouton, et se
lève tout seul l'heure venue. Tu peux donc envoyer le lien une semaine à l'avance.

Le compte à rebours du navigateur n'est qu'un confort : **`POST /api/…/choose` refuse aussi un
choix envoyé avant la date**. Sans ce second verrou, une requête directe ouvrirait la carte en
avance.

Deux garde-fous à la création : la date doit être au format ISO — `new Date` est si permissif que
« le 25 décembre » devenait 2001-12-24, accepté en silence — et elle doit tomber avant l'expiration
de la page, sans quoi la carte ne s'ouvrirait jamais.

## Le QR code

La vue admin et l'écran de fin de création affichent le QR code du lien public, en SVG (net à
n'importe quelle taille d'impression) et téléchargeable. L'idée : l'imprimer et le glisser dans une
vraie carte en papier, que la personne scanne.

Il est généré dans le navigateur, à partir d'une URL que le client possède déjà — pas d'aller-retour
serveur pour ça.

## L'aperçu

Deux aperçus, un seul composant — `GiftView` sert à la fois la page réelle et les deux aperçus,
donc aucun ne peut mentir.

- **L'aperçu en direct**, à l'étape « La présentation » : une réduction du rendu réel, qui réagit à chaque réglage.
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

**Les images**, enfin : sans `BLOB_READ_WRITE_TOKEN`, le repli écrit dans `.media/`.
Ce dossier n'est durable que si un volume persistant est monté ; sinon les images
disparaissent au redéploiement suivant.

## L'assistant de composition

Création et édition passent par le même composant, en deux étapes :

1. **Les cadeaux** — de 2 à 10 propositions, avec extraction depuis une URL ou saisie manuelle.
2. **La présentation** — l'occasion, puis un cadre par écran que traverse la personne qui reçoit
   (**Intro**, **Cadeaux**, **Choix**), puis le thème et le lien. Avec un aperçu en direct à côté
   des réglages.

**« La carte » n'a pas survécu comme étape.** Elle ne portait que deux champs : le nom interne et le
prénom du receveur. Le prénom a rejoint le cadre **Intro**, là où il s'affiche ; le nom a rejoint le
cadre **Lien**, puisque c'est lui qui fabrique l'adresse. Celle-ci en découle sans réglage :
personne ne s'en soucie, et le serveur résout tout seul une collision en ajoutant `-2`, `-3`…

Chaque étape ne valide que ses propres champs, pour ne pas bloquer sur une étape qu'on n'a pas
encore atteinte. À l'enregistrement, tout est revalidé et une erreur en amont **ramène sur l'étape
concernée** — sinon le message parlerait d'un champ invisible. L'aperçu reste accessible partout.

En création, l'assistant avance pas à pas. En édition tout est déverrouillé : on saute d'une étape
à l'autre par les puces du haut, et le bouton d'enregistrement est présent sur chacune.

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

- **Création anonyme non limitée.** `POST /api/pages` et `POST /api/upload` sont des vecteurs de
  spam (création massive, téléversements). Assumé au MVP ; un rate-limit par IP et/ou un captcha
  sont à prévoir avant toute exposition publique sérieuse.
- **Le slug public est devinable.** Ne rien mettre de sensible dans une page-cadeau.
- **Le mot du receveur n'est plus lié à l'auteur du choix.** Il part dans une seconde requête ; qui
  détient le lien peut donc l'écrire à sa place, tant que la carte n'en porte pas déjà un et que
  l'heure qui suit le choix n'est pas écoulée. C'est le prix du bouton « Laisser un mot » posé après
  la confirmation, et le même modèle de confiance que le choix lui-même : le lien fait foi.
- **`admin_token` est la seule protection admin.** 32 octets aléatoires, transmis dans l'URL :
  qui a le lien a les droits.
- **`@vercel/postgres` est déprécié** (Vercel Postgres a migré vers Neon). Il fonctionne toujours et
  lit les variables `POSTGRES_*` sans configuration. Le jour où il faut migrer vers le driver Neon,
  `lib/db.ts` est le seul fichier à toucher — l'API de template tagué est la même.
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
