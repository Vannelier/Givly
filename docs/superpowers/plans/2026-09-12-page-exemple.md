# La page d'exemple — plan d'implémentation

> **Pour un agent :** SOUS-COMPÉTENCE REQUISE — utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> sont cochables (`- [ ]`).

**But :** un bouton « Voir un exemple » sur l'accueil, qui mène à `/exemple` — une vraie page-cadeau,
jouable de bout en bout, sur des données figées, où rien n'est envoyé.

**Approche :** la spec `docs/superpowers/specs/2026-09-12-page-exemple-design.md` fait foi.
`app/exemple/page.tsx` rend `GiftView` en mode aperçu sur une page décrite dans `lib/exemple.ts`.
`GiftView` gagne un lien de sortie sérialisable. Deux garde-fous, écrits avant le code qu'ils
protègent et testés par mutation. Quatre photos libres de droits, chacune téléchargée avec l'accord de
l'utilisateur. Une mesure au navigateur avant de conclure.

**Outils :** Next 15 / React 19, harnais maison `scripts/check.ts` (pas de Jest), `sharp` (déjà une
dépendance), volet Browser pour la recherche des photos et la mesure.

---

## Ce qu'il faut savoir avant de commencer

**Branche.** `claude/page-exemple`, partie de `main` (`bf93618`). La branche
`claude/etape-presentation-densite`, encore ouverte, ne touche ni l'accueil, ni `GiftView`, ni
`lib/slug.ts`.

**Le harnais est vert en entier sur `main`**, y compris sur une copie Windows, depuis la PR #26 :
toute lecture de fichier y passe par `lire(chemin)`, qui rend le texte en LF, et un garde-fou refuse
tout `readFileSync` direct. Les nouveaux garde-fous utilisent `lire()` et `existsSync()`, jamais
`readFileSync`.

**Le mode aperçu n'envoie rien.** Dans `components/GiftView.tsx`, `confirm()` et `sendReply()` rendent
la main avant toute requête quand `mode === "preview"` (vers les lignes 392 et 426). C'est ce qui
permet d'exposer l'exemple à tous.

**Une page serveur ne passe pas de fonction à un composant client.** `GiftView` n'expose aujourd'hui
sa sortie d'aperçu que par `onExitPreview`, une fonction : `app/exemple/page.tsx`, composant serveur,
ne peut pas la lui donner. D'où le nouveau prop `lienSortie`, un libellé et une adresse.

**Ne lance jamais `npm run build` pendant qu'un `next dev` sert** : les deux se disputent `.next`.

**Conventions.** Le code parle français. **Les commentaires de code sont sans accents** et disent
*pourquoi*, jamais *quoi*, et ne doivent rien affirmer de faux. Les textes d'interface et le README
portent les accents. Les fichiers de `lib/` s'importent entre eux **en relatif** (`./types`), jamais
par `@/` : le harnais, lancé par `tsx`, les charge ainsi.

**Qui fait quoi.** Les tâches 1, 2, 4 et 5 peuvent partir en sous-agent. **Les tâches 3, 6, 7 et 8
sont menées par le coordinateur** : la 3 demande l'accord de l'utilisateur pour chaque
téléchargement, et un sous-agent ne peut pas le lui demander ; la 7 demande le navigateur.

---

## Ce qu'on touche

| fichier | rôle |
|---|---|
| `scripts/check.ts` | deux garde-fous |
| `lib/exemple.ts` | **nouveau** — les données de l'exemple |
| `app/exemple/page.tsx` | **nouveau** — la page `/exemple` |
| `components/GiftView.tsx` | le prop `lienSortie` |
| `lib/slug.ts` | `exemple` dans `RESERVED_SLUGS` |
| `app/editor.css` | le lien du bandeau sans soulignement |
| `public/exemple/*.jpg` | **nouveaux** — les quatre photos |
| `app/page.tsx` | le bouton « Voir un exemple » |
| `app/sitemap.ts` | `/exemple` |
| `README.md` | les tables, une section, les sources des photos |

---

### Tâche 1 : le garde-fou du mode aperçu

**Fichiers :** `scripts/check.ts`.

- [ ] **Étape 1 : relever l'état de départ**

```bash
npm run check
```

Attendu : `N vérifications passées.`, sans échec. Note `N`.

- [ ] **Étape 2 : importer `existsSync`**

Ligne 8, remplace :

```ts
import { readFileSync, readdirSync } from "node:fs";
```

par :

```ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
```

- [ ] **Étape 3 : écrire le test qui échoue**

Juste après la fin du test `"toute page du site occupe un slug reserve"` (sa ligne `});` finale, vers
la ligne 155), ajoute :

```ts
/*
 * La page d'exemple se joue en mode apercu : on leve le voile, on choisit, on
 * confirme, on ecrit un mot — et rien ne part, parce que ce mode rend la main
 * avant toute requete. En mode direct, le premier visiteur qui choisirait
 * enverrait une requete a /api/pages/exemple/choose : au mieux une erreur sur
 * la page censee convaincre, au pire une ecriture sur une carte reelle qui
 * porterait ce slug.
 */
test("la page d'exemple reste en mode apercu", () => {
  const chemin = new URL("../app/exemple/page.tsx", import.meta.url);
  assert.ok(existsSync(chemin), "app/exemple/page.tsx introuvable");
  const rendus = lire(chemin).match(/<GiftView\b[^>]*>/g) ?? [];
  assert.equal(rendus.length, 1, "la page d'exemple doit rendre GiftView une fois, et une seule");
  assert.match(rendus[0], /\bmode="preview"/, "GiftView n'y est plus en mode apercu");
});
```

`[^>]*` traverse les retours à la ligne : le test tient si le JSX est réparti sur plusieurs lignes. Il
exige que les props de `GiftView` ne contiennent pas de `>` — pas de fonction fléchée en ligne. Si un
remaniement en ajoute une, le test échouera bruyamment plutôt que de laisser passer.

- [ ] **Étape 4 : le lancer et constater l'échec**

```bash
npm run check
npx tsc --noEmit
```

Attendu : `1 échec(s) sur N+1`, `la page d'exemple reste en mode apercu` avec
`app/exemple/page.tsx introuvable`. `tsc` silencieux.

- [ ] **Étape 5 : commiter**

```
Garde-fou : la page d'exemple reste en mode apercu

Ecrit avant la page qu'il protege. En mode direct, le premier visiteur qui
choisirait un cadeau enverrait une requete a /api/pages/exemple/choose ; en
mode apercu, GiftView rend la main avant toute requete.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 2 : la page, ses données, et le garde-fou des photos

**Fichiers :** `lib/exemple.ts` (nouveau), `app/exemple/page.tsx` (nouveau),
`components/GiftView.tsx`, `lib/slug.ts`, `app/editor.css`, `scripts/check.ts`.

- [ ] **Étape 1 : les données — `lib/exemple.ts`**

```ts
import { ITEMS_MESSAGE_HINT, ITEMS_TITLE_HINT, occasionById } from "./occasions";
import type { PublicPage } from "./types";

/*
 * La page-cadeau que montre /exemple. Figee, jamais en base : la demonstration
 * de db/seed.sql est une vraie carte, et le premier visiteur qui y choisirait un
 * cadeau la verrouillerait pour tous les suivants.
 *
 * Les textes sont ceux que propose l'occasion, lus ici et non recopies :
 * l'exemple montre ce qu'on obtient sans rien ecrire, et suit toute retouche de
 * ces formules. Les prenoms sont epicenes, et les cadeaux melent experiences et
 * objets — la neutralite ne s'arrete pas a eux.
 */
const anniversaire = occasionById("anniversaire");

export const EXEMPLE: PublicPage = {
  slug: "exemple",
  recipient_name: "Camille",
  intro_message: anniversaire.intro,
  welcome_message: anniversaire.welcomeHint,
  open_label: anniversaire.openHint,
  wait_message: anniversaire.waitHint,
  items_title: ITEMS_TITLE_HINT,
  items_message: ITEMS_MESSAGE_HINT,
  thank_you_message: anniversaire.thanksHint,
  signature: "Sacha",
  reply_message: "",
  header_image_url: null,
  reveal_at: null,
  theme: {
    layout: "grid",
    palette: { id: anniversaire.palette },
    occasion: anniversaire.id,
    motif: anniversaire.motif !== "none",
    cover: true,
    effect: anniversaire.effect,
    // Le mot du receveur est active pour que le parcours se voie en entier.
    reply: true,
  },
  items: [
    {
      id: "exemple-parachute",
      label: "Un saut en parachute",
      note: "En tandem avec un moniteur. Tu choisis le jour.",
      image_url: "/exemple/parachute.jpg",
      source_url: null,
    },
    {
      id: "exemple-appareil-photo",
      label: "Un appareil photo instantané",
      note: "Et trois recharges pour commencer.",
      image_url: "/exemple/appareil-photo.jpg",
      source_url: null,
    },
    {
      id: "exemple-restaurant",
      label: "Un dîner au restaurant",
      note: "Une table pour deux, là où tu en as envie.",
      image_url: "/exemple/restaurant.jpg",
      source_url: null,
    },
    {
      id: "exemple-casque",
      label: "Un casque audio sans fil",
      note: "Pour tes trajets, et le calme qui va avec.",
      image_url: "/exemple/casque.jpg",
      source_url: null,
    },
  ],
  chosen_item_id: null,
  chosen_at: null,
};
```

Si `tsc` refuse un champ — le type `PublicPage` de `lib/types.ts` fait foi —, **arrête-toi et
rapporte-le** plutôt que d'ajuster à l'aveugle.

- [ ] **Étape 2 : le garde-fou des photos, qui doit échouer**

Dans `scripts/check.ts`, ajoute l'import près des autres imports de `../lib/` :

```ts
import { EXEMPLE } from "../lib/exemple";
```

Puis, juste après le test `"la page d'exemple reste en mode apercu"` :

```ts
/*
 * Chaque photo de l'exemple doit exister sous public/ : une photo renommee ou
 * oubliee afficherait une image cassee, precisement la ou le produit doit
 * seduire. Les donnees sont importees et non relues comme du texte : une regex
 * qui ne trouverait plus rien passerait en silence.
 */
test("chaque photo de la page d'exemple existe", () => {
  assert.equal(EXEMPLE.items.length, 4, "l'exemple montre quatre cadeaux");
  for (const item of EXEMPLE.items) {
    assert.ok(item.image_url, `${item.label} : pas de photo`);
    assert.ok(item.image_url.startsWith("/"), `${item.label} : photo hors du site (${item.image_url})`);
    assert.ok(
      existsSync(new URL(`../public${item.image_url}`, import.meta.url)),
      `${item.label} : ${item.image_url} manque sous public/`,
    );
  }
});
```

- [ ] **Étape 3 : `GiftView` gagne un lien de sortie**

Dans `components/GiftView.tsx` :

1. Ajoute l'import, avec les autres en tête de fichier :

```ts
import Link from "next/link";
```

2. Dans le type `Props`, juste après `onExitPreview?: () => void;` :

```ts
  /**
   * Apercu public : un lien de sortie plutot qu'une fonction. Une page serveur,
   * comme /exemple, ne peut pas passer de fonction a un composant client ; un
   * libelle et une adresse, si.
   */
  lienSortie?: { libelle: string; href: string };
```

3. Dans la signature, juste après `onExitPreview,` :

```ts
  lienSortie,
```

4. Dans le bloc `{mode === "preview" && ( <div className="btn-row" … > … )}` de l'écran de fin (vers la
ligne 568), juste après le bloc `{onExitPreview && ( … )}` qui rend « Revenir au formulaire », et
toujours à l'intérieur du `<div className="btn-row">` :

```tsx
              {lienSortie && (
                <Link className="btn btn--sm" href={lienSortie.href}>
                  {lienSortie.libelle}
                </Link>
              )}
```

L'éditeur, qui passe `onExitPreview` et pas `lienSortie`, ne voit aucun changement.

- [ ] **Étape 4 : la page — `app/exemple/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import GiftView from "@/components/GiftView";
import { EXEMPLE } from "@/lib/exemple";

export const metadata: Metadata = {
  title: "Exemple de page-cadeau — MyPresentsForYou",
  description:
    "Une vraie page-cadeau à essayer : lève le voile, choisis parmi quatre idées, confirme. Rien n'est envoyé.",
  alternates: { canonical: "/exemple" },
};

/*
 * Une page-cadeau figee, jouee en mode apercu : on leve le voile, on choisit,
 * on confirme, on ecrit un mot, et rien ne part. `scripts/check.ts` refuse
 * qu'elle quitte ce mode.
 *
 * Le bandeau est celui de l'apercu de l'editeur. Le voile, en position fixe et
 * au-dessus, le recouvre pendant l'ouverture : on arrive ici par un bouton qui
 * dit deja « exemple ».
 */
export default function ExemplePage() {
  return (
    <>
      <div className="preview-ribbon">
        Exemple — rien n&apos;est envoyé
        <Link className="preview-ribbon__exit" href="/creer">
          Composer la mienne
        </Link>
      </div>
      <GiftView
        page={EXEMPLE}
        mode="preview"
        lienSortie={{ libelle: "Composer ma page-cadeau", href: "/creer" }}
      />
    </>
  );
}
```

- [ ] **Étape 5 : réserver l'adresse**

Dans `lib/slug.ts`, dans `RESERVED_SLUGS`, juste après `"questions",` :

```ts
  "exemple",
```

Sans elle, le garde-fou existant `toute page du site occupe un slug reserve` échoue dès que le dossier
`app/exemple/` existe.

- [ ] **Étape 6 : le lien du bandeau, sans soulignement**

`.preview-ribbon__exit` a été dessiné pour un `<button>` ; appliqué à un lien, il hériterait du
soulignement du navigateur — les liens du site sont colorés, mais rien ne retire ce soulignement.
Dans `app/editor.css`, règle `.preview-ribbon__exit` (vers la ligne 1307), ajoute une déclaration :

```css
  text-decoration: none;
```

Sans effet sur le bouton de l'éditeur.

- [ ] **Étape 7 : vérifier**

```bash
npm run check
npx tsc --noEmit
```

Attendu : **un seul échec**, `chaque photo de la page d'exemple existe`, avec
`Un saut en parachute : /exemple/parachute.jpg manque sous public/`. Les photos arrivent à la
tâche 3 : c'est le bon échec. Le garde-fou du mode aperçu est passé au vert. `tsc` silencieux.

- [ ] **Étape 8 : commiter**

```
Ajoute la page d'exemple, jouee en mode apercu

L'accueil expliquait le produit sans le montrer : rien ne permettait de
toucher une page-cadeau avant d'en avoir compose une. /exemple rend
GiftView en mode apercu sur des donnees figees — on leve le voile, on
choisit, on confirme, et rien ne part.

GiftView gagne un lien de sortie serialisable : une page serveur ne peut
pas lui passer la fonction qu'utilise l'editeur.

Le garde-fou des photos echoue : elles arrivent au commit suivant.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 3 : les quatre photos — menée par le coordinateur, avec l'utilisateur

**Fichiers :** `public/exemple/parachute.jpg`, `appareil-photo.jpg`, `restaurant.jpg`, `casque.jpg`.

- [ ] **Étape 1 : trouver quatre candidates**

Dans le volet Browser, sur Unsplash (licence Unsplash, **pas** Unsplash+) ou Pexels. Critères :

- **aucun visage au premier plan** : le ciel et le parachute vus de loin, une table dressée, les
  objets seuls ;
- **aucune marque lisible** ;
- sujet net, cadrage paysage ou carré — la carte affiche l'image entière (`object-fit: contain`),
  sur un fond flouté tiré d'elle.

Pour chacune, relève : l'adresse de la page, l'auteur, la licence, et l'adresse de l'image réduite
(`images.unsplash.com/…?w=1600`, ou l'équivalent Pexels), pour ne pas télécharger un original de
plusieurs mégaoctets.

- [ ] **Étape 2 : demander l'accord, avant tout téléchargement**

Présente les quatre à l'utilisateur, une ligne chacune : nom de fichier cible, page source, auteur,
licence, poids approximatif. **Aucun téléchargement sans un accord explicite.**

- [ ] **Étape 3 : télécharger, puis réduire**

Télécharge dans le scratchpad (`curl -L -o …`). Puis réduis, avec un script du scratchpad — jamais du
dépôt :

```js
const sharp = require("sharp");
// [source, destination] pour chacune des quatre
await sharp(source)
  .rotate() // applique l'orientation EXIF avant de la retirer
  .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(destination);
```

`sharp` retire les métadonnées par défaut.

- [ ] **Étape 4 : vérifier**

```bash
ls -la public/exemple/
npm run check
```

Attendu : quatre fichiers ; `N+2 vérifications passées.`, sans échec.

- [ ] **Étape 5 : commiter**

Le message donne, pour chaque photo, l'auteur, la page source et la licence. Ces sources reviennent
dans le README à la tâche 5.

---

### Tâche 4 : le bouton de l'accueil, et le sitemap

**Fichiers :** `app/page.tsx`, `app/sitemap.ts`.

- [ ] **Étape 1 : le bouton**

Dans `app/page.tsx`, bloc `<div className="lp-cta">` (vers la ligne 67), remplace :

```tsx
            <Link className="btn btn--auto" href="/creer">
              Composer ma page-cadeau
            </Link>
            <span className="lp-cta__note">Gratuit · sans compte · trois étapes</span>
```

par :

```tsx
            <Link className="btn btn--auto" href="/creer">
              Composer ma page-cadeau
            </Link>
            <Link className="btn btn--ghost btn--auto" href="/exemple">
              Voir un exemple
            </Link>
            <span className="lp-cta__note">Gratuit · sans compte · trois étapes</span>
```

`btn--auto` vit dans `landing.css` : le bouton secondaire le porte aussi, pour avoir la taille du
principal. L'action principale reste la première. Le téléphone dessiné ne change pas.

- [ ] **Étape 2 : le sitemap**

Dans `app/sitemap.ts`, dans la liste `pages`, juste après `["/questions", 0.8],` :

```ts
    ["/exemple", 0.7],
```

- [ ] **Étape 3 : vérifier et commiter**

```bash
npm run check
npx tsc --noEmit
```

Attendu : vert, `tsc` silencieux.

```
Ajoute a l'accueil un bouton vers la page d'exemple

L'accroche n'offrait qu'une action, composer. « Voir un exemple » la suit,
en bouton secondaire : l'action principale reste la premiere. /exemple
entre au sitemap — au contraire des pages-cadeau, qui sont privees, c'est
une page publique du site.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 5 : le README

**Fichiers :** `README.md`. Le coordinateur fournit à l'agent, pour chaque photo, l'auteur, la page
source et la licence relevés à la tâche 3.

- [ ] **Étape 1 : la carte du code**

Dans la table de la section « Carte du code » :

- remplace `| \`app/page.tsx\` | page d'accueil : présente l'outil et renvoie vers \`/creer\` |` par
  `| \`app/page.tsx\` | page d'accueil : présente l'outil et renvoie vers \`/creer\` et \`/exemple\` |` ;
- juste après la ligne de `app/[slug]/page.tsx`, ajoute :

```markdown
| `app/exemple/page.tsx` | la page d'exemple : une page-cadeau figée, jouée en mode aperçu |
| `lib/exemple.ts` | les données de l'exemple : l'occasion, les prénoms, les quatre cadeaux |
```

- [ ] **Étape 2 : les routes**

Dans la table des routes, juste après la ligne `/creer`, ajoute :

```markdown
| `/exemple` | une page-cadeau d'exemple, jouable de bout en bout ; rien n'est envoyé |
```

Et remplace la phrase `` `/sitemap.xml` ne déclare que l'accueil et `/creer`, jamais les cartes. `` par
`` `/sitemap.xml` déclare les pages du site — l'accueil, `/creer`, `/questions`, `/exemple`… —, jamais
les cartes. ``

- [ ] **Étape 3 : une section**

Juste avant la section `## La marque, le favicon et la bannière`, ajoute :

```markdown
## La page d'exemple

L'accueil expliquait le produit sans le montrer : le téléphone dessiné à côté de l'accroche est une
maquette figée. **« Voir un exemple »** mène à `/exemple`, une vraie page-cadeau qu'on peut jouer de
bout en bout — lever le voile, choisir, confirmer, laisser un mot.

**Elle ne vit pas en base.** La démonstration de `db/seed.sql` est une vraie carte : le premier
visiteur qui y choisirait un cadeau la verrouillerait pour tous les suivants. `/exemple` rend
`GiftView` en **mode aperçu** sur des données figées (`lib/exemple.ts`) ; dans ce mode, le choix et le
mot du receveur rendent la main avant toute requête. Un garde-fou refuse qu'elle quitte ce mode.

**Ses textes sont ceux de l'occasion anniversaire**, lus et non recopiés : l'exemple montre ce qu'on
obtient sans rien écrire. Les prénoms sont épicènes — Camille, Sacha — et les quatre cadeaux mêlent
expériences et objets.

**Ses photos** sont libres de droits, réduites à 1 200 px et servies depuis `public/exemple/`. Un
garde-fou vérifie que chacune existe.

| photo | auteur | source | licence |
|---|---|---|---|
| `parachute.jpg` | … | … | … |
| `appareil-photo.jpg` | … | … | … |
| `restaurant.jpg` | … | … | … |
| `casque.jpg` | … | … | … |
```

Le coordinateur remplit chaque `…` de la table avec ce qu'il a relevé à la tâche 3, **avant** de
confier la tâche : aucune cellule ne part vide.

- [ ] **Étape 4 : vérifier et commiter**

```bash
npm run check
```

Attendu : vert.

```
Documente la page d'exemple et les sources de ses photos

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

### Tâche 6 : tester les deux garde-fous par mutation — coordinateur

Chaque mutation, lancée par un script du scratchpad : appliquer, `npm run check`, relever le message,
restaurer (`git checkout -- <fichier>`, ou renommer en retour). Aucun commit.

| # | mutation | attendu |
|---|---|---|
| M1 | retirer `mode="preview"` de `app/exemple/page.tsx` | `GiftView n'y est plus en mode apercu` |
| M2 | le remplacer par `mode="live"` | idem |
| M3 | renommer `public/exemple/casque.jpg` | `Un casque audio sans fil : /exemple/casque.jpg manque sous public/` |
| M4 | mettre `image_url: null` au parachute dans `lib/exemple.ts` | `Un saut en parachute : pas de photo` |
| M5 | retirer `"exemple"` de `RESERVED_SLUGS` | `/exemple manque dans RESERVED_SLUGS` |

À la fin : `git status --short` vide, `npm run check` vert.

---

### Tâche 7 : mesurer — coordinateur

Serveur de développement démarré, **page posée** avant chaque relevé : `await document.fonts.ready`
puis une demi-seconde — au chantier précédent, une mesure prise trop tôt avait menti de 90 px.

- [ ] **`/exemple` à 375 × 812, puis à 1440 × 900** :
  - le voile s'affiche, avec « Pour Camille », « Joyeux anniversaire » et « Ouvrir mon cadeau » ;
  - après l'ouverture : les confettis se montent, et le bandeau « Exemple — rien n'est envoyé » est
    visible, son lien sans soulignement ;
  - les quatre cartes, et leurs photos chargées (`naturalWidth > 0` pour chaque `img.thumb__img`) ;
  - choisir un cadeau, confirmer : l'écran de fin propose « Composer ma page-cadeau », lien vers
    `/creer` ;
  - le mot du receveur : l'écrire, l'envoyer, voir sa confirmation ;
  - `document.documentElement.scrollWidth === innerWidth`.
- [ ] **Le journal réseau de tout le parcours** : **aucune requête vers `/api/`**.
- [ ] **La console** : aucune erreur, aucun avertissement d'hydratation.
- [ ] **L'accueil à 375 et à 1440** : les deux boutons et la note, dans cet ordre ; aucun débordement
  horizontal ; « Voir un exemple » mène à `/exemple`.
- [ ] **Le poids des photos** : `ls -la public/exemple/`.

Un écart à l'attendu se comprend avant de se corriger.

---

### Tâche 8 : les portes, et la livraison — coordinateur

- [ ] Arrêter le serveur de développement, **puis** :

```bash
npm run check
npx tsc --noEmit
npm run build
```

Attendu : vert, silencieux, réussi.

- [ ] Pousser : `git push -u origin claude/page-exemple`.
- [ ] `gh` est absent de ce poste : écrire le corps de la PR dans le scratchpad, le donner à
  l'utilisateur avec le lien `…/pull/new/claude/page-exemple`, **base `main`**, en brouillon. Le corps
  décrit le défaut, la correction, les mesures relevées à la tâche 7, et **rappelle la vérification
  à faire en base avant de déployer** : qu'aucune carte n'existe déjà à `/exemple`. Il se termine par :

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
