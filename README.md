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
| `app/creer/page.tsx` | assistant de création, en deux étapes |
| `app/[slug]/page.tsx` | page-cadeau publique (SSR + `generateMetadata` pour l'aperçu de lien) |
| `app/admin/[token]/page.tsx` | vue admin : cadeau choisi, liens, édition, clôture |
| `components/GiftView.tsx` | le rendu que voit le receveur — **le même** composant sert à l'aperçu |
| `components/editor/PageEditor.tsx` | assistant partagé création / édition |
| `lib/palettes.ts` | les huit palettes ; seul leur identifiant est stocké |
| `lib/occasions.ts` | occasions et polices ; idem, seuls les identifiants sont stockés |
| `components/GiftMotif.tsx` | décors SVG des occasions |
| `components/GiftCover.tsx` | voile d'ouverture et compte à rebours |
| `components/QrCard.tsx` | QR code du lien public |
| `scripts/brand.mjs` | fabrique la marque : `app/icon.svg`, `app/favicon.ico`, les PNG |
| `app/opengraph-image.tsx` | la bannière de partage du site (1200 × 630) |
| `components/PrintableCard.tsx` | la feuille A4 pliable : deux panneaux, le pli, le QR |
| `components/PrintCarousel.tsx` | les flèches qui font défiler les modèles |
| `lib/printModels.ts` | les dix modèles ; seul l'identifiant est retenu |
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
| `/creer` | formulaire de création |
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
| **Ouverture** | Intro | Le voile à lever, en six styles : voile, rideau, volets, enveloppe, couvercle, halo. Désactivable. |
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
| **Effet** | Thème | Confettis, pétales, étincelles ou neige, joués une fois sur la page découverte. Proposé par l'occasion. |
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

`/admin/[token]/imprimer` : une **feuille A4 paysage, pliée en deux** — le pliage de la carte de
vœux classique. Aucun réglage d'imprimante, aucun découpage, et l'intérieur reste vierge pour un
mot écrit à la main.

Le panneau **droit** porte la couverture (le prénom, le mot d'ouverture, le titre), le **gauche**
le dos (le QR code, la légende, la signature). On rabat le gauche derrière le droit : le pli tombe
à gauche, la couverture est devant.

Le format précédent ne tenait pas ses promesses : le bandeau invitait à plier, mais la feuille de
style forçait `@page { size: A6 }` et la carte faisait exactement 105 × 148 mm — il n'y avait rien
à plier, et une imprimante chargée en A4 la calait dans un coin.

**Dix modèles, au carrousel.** Quatre compositions — `centre`, `cadre`, `bandeau`, `affiche` —
déclinées sur les décors existants. La liste est plate (`lib/printModels.ts`) : chaque entrée est
une combinaison déjà arbitrée, pas deux sélecteurs à croiser, parce qu'un carrousel qu'on parcourt
à la flèche doit être court. Comme les palettes et les occasions, seul l'identifiant compte ; tout
le rendu vit dans `app/print.css`, et ajouter un modèle coûte une ligne et un bloc de style.

Le choix **n'est pas enregistré** : il vit dans l'état de la page. Le persister demanderait une
colonne, une migration et une règle de validation, pour un geste qu'on fait une fois.

Le carrousel émet une **direction**, pas un identifiant, et le parent calcule le voisin en forme
fonctionnelle. Sans ça, deux clics rapprochés partaient du même état — la seconde flèche
recalculait le voisin de l'ancien modèle et n'avançait pas.

À l'écran, la feuille garde ses dimensions réelles en millimètres et se réduit par un facteur
mesuré, pas deviné : c'est la même boîte qui part à l'impression, donc l'aperçu ne peut pas mentir
sur les proportions. Le QR passe en correction d'erreur **Q** — sur papier il sera plié, manipulé,
parfois imprimé à court d'encre.

Les commandes disparaissent à l'impression ; `print-color-adjust: exact` force le navigateur à
imprimer les aplats de couleur, qu'il supprime par défaut. La composition `bandeau` consomme donc
franchement de l'encre.

⚠️ **Ce qu'aucune vérification ne couvre** : le rendu papier, le sens du pli, les marges réelles de
l'imprimante et la lisibilité du QR une fois imprimé. La géométrie à l'écran est contrôlée ; le
premier tirage reste à faire.

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

Comme la palette et le décor, **l'occasion en propose un** : neige pour Noël, confettis pour un
anniversaire, pétales pour la Saint-Valentin. Il suit l'occasion tant que le donneur n'en a pas
choisi un autre.

Trois règles de fabrication :

- **Une seule salve, jamais une boucle.** Un effet qui tournerait sans fin consommerait la batterie
  pendant tout le temps de lecture, pour un charme qui s'use en trois secondes.
- **Aucun `Math.random` au rendu.** Les positions viennent d'une suite déterministe indexée sur le
  numéro de la particule. Un tirage aléatoire donnerait des valeurs différentes côté serveur et côté
  navigateur, et l'hydratation divergerait à chaque chargement.
- **Seuls `transform` et `opacity` sont animés**, sur 26 `<span>` vides : le compositeur les déplace
  sans repasser par la mise en page ni la peinture. Sous `prefers-reduced-motion`, l'effet n'est pas
  ralenti mais retiré — c'est du décor pur.

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

Création et édition passent par le même composant, en deux étapes :

1. **Les cadeaux** — de 1 à 10 propositions, avec extraction depuis une URL ou saisie manuelle.
   Le minimum est bien **un** : voir « Le cadeau unique ».
2. **La présentation** — l'occasion, puis un cadre par écran que traverse la personne qui reçoit
   (**Intro**, **Cadeaux**, **Choix**), puis le thème et le lien. Avec un aperçu en direct à côté
   des réglages, sur écran large.

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
