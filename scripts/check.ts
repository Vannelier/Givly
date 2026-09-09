/**
 * Vérifications de la logique pure : validation, slugs, extraction, expiration.
 * Aucune base de données requise.
 *
 *   npm run check
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { canonicaliseUrl, cleanTitle, parseHtml } from "../lib/extract";
import { sslFor, toQuery } from "../lib/db";
// @ts-expect-error — module JavaScript simple, volontairement hors du bundle Next.
import { sslFor as bootSslFor, mediaDir as bootMediaDir } from "./boot.mjs";
import {
  DEFAULT_EFFECT_ID,
  DEFAULT_FONT_ID,
  DEFAULT_OCCASION_ID,
  DEFAULT_OPENING_ID,
  EFFECTS,
  FONTS,
  ITEMS_MESSAGE_HINT,
  ITEMS_TITLE_HINT,
  OCCASIONS,
  OCCASION_GROUPS,
  OPENINGS,
  effectById,
  fontById,
  occasionById,
  openingById,
} from "../lib/occasions";
import { DEFAULT_PALETTE_ID, PALETTES, paletteById, paletteIdOf } from "../lib/palettes";
import { hexToHsl, hslToHex, styleDeTeinte, teinteDuTheme } from "../lib/carteCouleur";
import { RESERVED_SLUGS, slugError, slugify, suggestVariant } from "../lib/slug";
import { REPLY_WINDOW_MS, isExpired, isLocked, isSealed, replyWindowOpen } from "../lib/types";
import { LIMITS } from "../lib/limits";
import { MEDIA_DIR } from "../lib/mediaStore";
import {
  DEFAULT_PRINT_LAYOUT,
  DEFAULT_PRINT_MOTIF,
  PRINT_LAYOUTS,
  PRINT_MOTIFS,
  printLayoutById,
  printMotifIndex,
  stepPrintMotif,
} from "../lib/printModels";
import sharp from "sharp";
import { MAX_IMAGE_EDGE, shrinkImage } from "../lib/image";
import { ValidationError, validateCreate, validatePatch, validateTheme } from "../lib/validation";
import { QUOTAS, adresseClient, creerLimiteur } from "../lib/rateLimit";

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    const out = fn() as unknown;
    // Une fonction asynchrone renverrait une promesse, ses echecs seraient avales
    // et le test passerait toujours. On refuse explicitement.
    if (out && typeof (out as Promise<unknown>).then === "function") {
      throw new Error("test asynchrone : le harnais est synchrone");
    }
    passed++;
  } catch (err) {
    failures.push(`${name}\n    ${(err as Error).message.split("\n")[0]}`);
  }
}

function throwsValidation(fn: () => unknown, expectedField?: string) {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof ValidationError, `attendu ValidationError, reçu ${String(err)}`);
    if (expectedField) assert.equal(err.field, expectedField);
    return;
  }
  assert.fail("aucune erreur levée");
}

// --- Slugs -----------------------------------------------------------------

test("slugify enlève accents, ponctuation et tirets aux extrémités", () => {
  assert.equal(slugify("  Joyeux anniversaire, Éléonore !  "), "joyeux-anniversaire-eleonore");
  assert.equal(slugify("L'été"), "lete");
  assert.equal(slugify("---"), "");
});

test("slugify tronque à 60 caractères sans laisser de tiret final", () => {
  const out = slugify("a".repeat(58) + " bcd");
  assert.ok(out.length <= 60);
  assert.ok(!out.endsWith("-"));
});

test("slugError refuse trop court, majuscules, tirets aux bords et réservés", () => {
  assert.ok(slugError("ab"));
  assert.ok(slugError("Bonjour"));
  assert.ok(slugError("-bonjour"));
  assert.ok(slugError("bonjour-"));
  assert.ok(slugError("a".repeat(61)));
  for (const reserved of RESERVED_SLUGS) assert.ok(slugError(reserved), reserved);
  assert.equal(slugError("pour-toi-2026"), null);
});

/*
 * Le test au-dessus verifie que tout ce qui est declare reserve est bien refuse.
 * Celui-ci verifie l'inverse, qui est le vrai risque : ajouter une page sous
 * `app/` sans l'inscrire dans la liste. Une carte pourrait alors prendre son
 * adresse, et la page deviendrait inatteignable — en silence.
 */
test("toute page du site occupe un slug reserve", () => {
  const pages = readdirSync("app", { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    // Segments dynamiques et groupes de routes ne sont pas des adresses fixes ;
    // `api` a son propre prefixe, deja reserve.
    .filter((n) => !n.startsWith("[") && !n.startsWith("(") && n !== "api");

  assert.ok(pages.length > 0, "aucun dossier de page trouve");
  for (const nom of pages) {
    assert.ok(RESERVED_SLUGS.has(nom), `/${nom} manque dans RESERVED_SLUGS`);
  }
});

test("suggestVariant reste dans la limite de longueur", () => {
  assert.equal(suggestVariant("cadeau", 2), "cadeau-2");
  const long = suggestVariant("a".repeat(60), 3);
  assert.ok(long.length <= 60);
  assert.ok(long.endsWith("-3"));
});

// --- Validation ------------------------------------------------------------

const validItems = [
  { label: "Collier Fluorite", image_url: "https://exemple.test/a.jpg" },
  { label: "Dîner au restaurant", note: "Un soir de semaine" },
];

const validBody = {
  slug: "pour-toi",
  name: "Anniversaire de Sophie",
  welcome_message: "Choisis ton cadeau",
  thank_you_message: "Merci, c'est noté",
  theme: { layout: "list" },
  items: validItems,
};

test("validateCreate accepte un corps correct et normalise", () => {
  const out = validateCreate(validBody);
  assert.equal(out.slug, "pour-toi");
  assert.equal(out.theme.layout, "list");
  assert.equal(out.items.length, 2);
  assert.equal(out.items[1].image_url, null);
  assert.equal(out.items[1].note, "Un soir de semaine");
});

test("validateCreate attribue des identifiants d'item stables et uniques", () => {
  const out = validateCreate(validBody);
  const ids = out.items.map((i) => i.id);
  assert.equal(new Set(ids).size, 2);
  for (const id of ids) assert.match(id, /^itm_[a-z0-9]{4,32}$/);
});

test("validateCreate conserve un id d'item déjà connu", () => {
  const out = validateCreate({
    ...validBody,
    items: [{ ...validItems[0], id: "itm_abcd1234" }, validItems[1]],
  });
  assert.equal(out.items[0].id, "itm_abcd1234");
});

test("validateCreate dédoublonne des ids identiques", () => {
  const out = validateCreate({
    ...validBody,
    items: [
      { ...validItems[0], id: "itm_abcd1234" },
      { ...validItems[1], id: "itm_abcd1234" },
    ],
  });
  assert.notEqual(out.items[0].id, out.items[1].id);
});

test("validateCreate accepte un cadeau unique mais refuse la liste vide", () => {
  // Un seul cadeau est un cas legitime : la carte devient une annonce.
  const solo = validateCreate({ ...validBody, items: [validItems[0]] });
  assert.equal(solo.items.length, 1);
  throwsValidation(() => validateCreate({ ...validBody, items: [] }), "items");
});

test("validateCreate refuse plus de 10 items", () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ label: `Cadeau ${i}` }));
  throwsValidation(() => validateCreate({ ...validBody, items: many }), "items");
});

test("validateCreate refuse un message trop long", () => {
  throwsValidation(
    () => validateCreate({ ...validBody, welcome_message: "x".repeat(281) }),
    "welcome_message",
  );
});

test("validateCreate accepte un message vide", () => {
  // Plus aucun champ de texte n'est obligatoire : le formulaire remplit lui-meme
  // le vide avec la suggestion qu'il affichait en placeholder.
  const out = validateCreate({ ...validBody, thank_you_message: "   ", welcome_message: "" });
  assert.equal(out.thank_you_message, "");
  assert.equal(out.welcome_message, "");
});

test("validateCreate remplace un label vide et refuse un label trop long", () => {
  const out = validateCreate({ ...validBody, items: [{ label: "" }, validItems[1]] });
  assert.equal(out.items[0].label, "Sans titre");
  throwsValidation(
    () => validateCreate({ ...validBody, items: [{ label: "x".repeat(81) }, validItems[1]] }),
  );
});

test("validateCreate refuse une URL non http(s)", () => {
  throwsValidation(() =>
    validateCreate({
      ...validBody,
      items: [{ label: "A", image_url: "javascript:alert(1)" }, validItems[1]],
    }),
  );
  throwsValidation(() =>
    validateCreate({ ...validBody, items: [{ label: "A", source_url: "pas une url" }, validItems[1]] }),
  );
});

test("validateCreate refuse un slug invalide ou réservé", () => {
  throwsValidation(() => validateCreate({ ...validBody, slug: "Pas Valide" }), "slug");
  throwsValidation(() => validateCreate({ ...validBody, slug: "admin" }), "slug");
});

test("validatePatch ne renvoie que les champs présents", () => {
  const out = validatePatch({ welcome_message: "Nouveau message" });
  assert.deepEqual(Object.keys(out), ["welcome_message"]);
});

test("validatePatch refuse un corps vide", () => {
  throwsValidation(() => validatePatch({}));
});

test("validatePatch applique les mêmes règles d'items", () => {
  assert.equal(validatePatch({ items: [validItems[0]] }).items?.length, 1);
  throwsValidation(() => validatePatch({ items: [] }), "items");
});

test("validatePatch accepte la remise à zéro de l'image de couverture", () => {
  const out = validatePatch({ cover_image_url: null });
  assert.equal(out.cover_image_url, null);
});

// --- Expiration et verrouillage --------------------------------------------

test("isExpired : null n'expire jamais, une date passée oui", () => {
  assert.equal(isExpired({ expires_at: null }), false);
  assert.equal(isExpired({ expires_at: new Date(Date.now() + 60_000).toISOString() }), false);
  assert.equal(isExpired({ expires_at: new Date(Date.now() - 60_000).toISOString() }), true);
});

test("isLocked suit chosen_at", () => {
  assert.equal(isLocked({ chosen_at: null }), false);
  assert.equal(isLocked({ chosen_at: new Date().toISOString() }), true);
});

// --- Extraction ------------------------------------------------------------

const BASE = "https://boutique.test/produits/collier";

test("parseHtml lit og:image et og:title", () => {
  const out = parseHtml(
    `<html><head><meta property="og:title" content="Collier Fluorite">
     <meta property="og:image" content="https://cdn.test/c.jpg">
     <meta property="og:site_name" content="Boutique"><title>ignoré</title></head><body></body></html>`,
    BASE,
  );
  assert.equal(out.ok, true);
  assert.equal(out.ok && out.image, "https://cdn.test/c.jpg");
  assert.equal(out.title, "Collier Fluorite");
  assert.equal(out.siteName, "Boutique");
});

test("parseHtml résout une og:image relative sur l'URL de la page", () => {
  const out = parseHtml(
    `<html><head><meta property="og:image" content="/img/c.jpg"></head></html>`,
    BASE,
  );
  assert.equal(out.ok && out.image, "https://boutique.test/img/c.jpg");
});

test("parseHtml retombe sur twitter:image puis sur <title>", () => {
  const out = parseHtml(
    `<html><head><title>Ma page</title><meta name="twitter:image" content="https://cdn.test/t.jpg"></head></html>`,
    BASE,
  );
  assert.equal(out.ok && out.image, "https://cdn.test/t.jpg");
  assert.equal(out.title, "Ma page");
});

test("parseHtml retombe sur la plus grande <img> plausible", () => {
  const out = parseHtml(
    `<html><body>
       <img src="/logo.png" width="800" height="600">
       <img src="/petit.png" width="80" height="80">
       <img src="/produit.png" width="1200" height="900">
     </body></html>`,
    BASE,
  );
  // logo.png est écarté par son nom, petit.png par sa taille.
  assert.equal(out.ok && out.image, "https://boutique.test/produit.png");
});

test("parseHtml renvoie une raison exploitable en cas d'echec", () => {
  const out = parseHtml("<html><head><title>Rien</title></head></html>", BASE);
  assert.equal(out.ok, false);
  assert.equal(out.ok === false && out.reason, "no_image");
});

test("parseHtml ignore les images en data: URI", () => {
  const out = parseHtml(
    `<html><head><meta property="og:image" content="data:image/png;base64,AAAA"></head></html>`,
    BASE,
  );
  assert.equal(out.ok, false);
});

test("parseHtml renvoie ok:false sans image, mais garde le titre", () => {
  const out = parseHtml(`<html><head><title>Restaurant Sebastian</title></head></html>`, BASE);
  assert.equal(out.ok, false);
  assert.equal(out.title, "Restaurant Sebastian");
});

test("parseHtml ne casse pas sur du HTML vide ou incohérent", () => {
  assert.equal(parseHtml("", BASE).ok, false);
  assert.equal(parseHtml("<<<>>> pas du html", BASE).ok, false);
});


// --- Extraction : JSON-LD, Amazon, titres, URLs ----------------------------

test("parseHtml lit un Product en JSON-LD quand il n'y a pas d'Open Graph", () => {
  const out = parseHtml(
    `<html><head><script type="application/ld+json">
       {"@context":"https://schema.org","@type":"Product",
        "name":"Collier Perle","image":["https://cdn.test/p1.jpg","https://cdn.test/p2.jpg"]}
     </script></head><body></body></html>`,
    BASE,
  );
  assert.equal(out.ok, true);
  assert.equal(out.ok && out.image, "https://cdn.test/p1.jpg");
  assert.equal(out.title, "Collier Perle");
});

test("parseHtml descend dans un @graph JSON-LD et accepte image objet", () => {
  const out = parseHtml(
    `<html><head><script type="application/ld+json">
       {"@graph":[{"@type":"WebSite","name":"Boutique"},
                  {"@type":"Product","name":"Bague","image":{"url":"https://cdn.test/b.jpg"}}]}
     </script></head></html>`,
    BASE,
  );
  assert.equal(out.ok && out.image, "https://cdn.test/b.jpg");
  assert.equal(out.title, "Bague");
});

test("parseHtml survit a un JSON-LD casse", () => {
  const out = parseHtml(
    `<html><head><script type="application/ld+json">{ pas du json </script>
     <meta property="og:image" content="https://cdn.test/ok.jpg"></head></html>`,
    BASE,
  );
  assert.equal(out.ok && out.image, "https://cdn.test/ok.jpg");
});

const AMAZON = "https://www.amazon.com.be/dp/B0D42B9ZNK";

test("parseHtml prend le titre et l'image produit sur Amazon, pas la banniere", () => {
  const out = parseHtml(
    `<html><head><title>Logitech Combo Touch ... : Amazon.com.be: High-tech</title></head><body>
       <img src="https://m.media-amazon.com/images/G/51/AmazonWeeklyDeal/promo.jpg" width="1200" height="900">
       <span id="productTitle"> Logitech Combo Touch, etui clavier </span>
       <img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/61sOE9uzlYL._AC_SL1500_.jpg"
            src="https://m.media-amazon.com/images/I/61sOE9uzlYL._AC_SX679_.jpg">
     </body></html>`,
    AMAZON,
  );
  assert.equal(out.ok, true);
  assert.equal(out.title, "Logitech Combo Touch, etui clavier");
  assert.equal(out.ok && out.image, "https://m.media-amazon.com/images/I/61sOE9uzlYL._AC_SL1500_.jpg");
});

test("parseHtml lit la carte data-a-dynamic-image d'Amazon et garde la plus grande", () => {
  const out = parseHtml(
    `<html><body><img id="landingImage"
       data-a-dynamic-image='{"https://m.media-amazon.com/img/petit.jpg":[300,300],"https://m.media-amazon.com/img/grand.jpg":[1500,1500]}'>
     </body></html>`,
    AMAZON,
  );
  assert.equal(out.ok && out.image, "https://m.media-amazon.com/img/grand.jpg");
});

test("le repli <img> ecarte les bannieres promotionnelles", () => {
  const out = parseHtml(
    `<html><body>
       <img src="/media/banner-promo.jpg" width="1200" height="900">
       <img src="/media/produit.jpg" width="800" height="800">
     </body></html>`,
    BASE,
  );
  assert.equal(out.ok && out.image, "https://boutique.test/media/produit.jpg");
});

test("cleanTitle retire le nom du site en suffixe", () => {
  assert.equal(
    cleanTitle("Collier Perle Graphique – Lola Troisfontaines", "Lola Troisfontaines", "www.lolatroisfontaines.com"),
    "Collier Perle Graphique",
  );
  assert.equal(cleanTitle("Bague | Ma Boutique", undefined, "maboutique.be"), "Bague");
});

test("cleanTitle garde un titre sans suffixe redondant", () => {
  assert.equal(cleanTitle("Collier Fluorite", "Autre Site", "autre.be"), "Collier Fluorite");
});

test("cleanTitle coupe sur un mot entier dans la limite du champ", () => {
  const out = cleanTitle("x".repeat(40) + " " + "y".repeat(60), undefined, "test.be");
  assert.ok(out.length <= LIMITS.itemLabel, `longueur ${out.length}`);
  assert.ok(out.endsWith("…"));
});

test("canonicaliseUrl reduit une fiche Amazon a son ASIN", () => {
  assert.equal(
    canonicaliseUrl("https://www.amazon.com.be/Logitech-Combo/dp/B0D42B9ZNK?pd_rd_w=x&ref_=y&th=1"),
    "https://www.amazon.com.be/dp/B0D42B9ZNK",
  );
});

test("canonicaliseUrl retire le pistage sans casser les vrais parametres", () => {
  assert.equal(
    canonicaliseUrl("https://boutique.test/p?id=42&utm_source=fb&fbclid=abc&couleur=vert"),
    "https://boutique.test/p?id=42&couleur=vert",
  );
});

test("canonicaliseUrl laisse passer une URL non analysable", () => {
  assert.equal(canonicaliseUrl("pas une url"), "pas une url");
});


// --- Nom de la carte et palettes -------------------------------------------

test("validateCreate accepte une carte sans nom", () => {
  // Le nom n'est plus obligatoire cote serveur : le formulaire en compose un a
  // partir de l'occasion et du prenom quand le donneur laisse le champ vide.
  const { name, ...sansNom } = validBody;
  void name;
  assert.equal(validateCreate(sansNom).name, "");
  assert.equal(validateCreate({ ...validBody, name: "   " }).name, "");
});

test("validateCreate refuse un nom trop long", () => {
  throwsValidation(() => validateCreate({ ...validBody, name: "x".repeat(81) }), "name");
});

test("validateCreate ne garde que l'identifiant de palette", () => {
  const out = validateCreate({ ...validBody, theme: { layout: "grid", palette: { id: "olive" } } });
  assert.deepEqual(out.theme.palette, { id: "olive" });
});

test("validateCreate ecarte une palette inconnue ou bricolee", () => {
  const inconnue = validateCreate({ ...validBody, theme: { palette: { id: "fuchsia" } } });
  assert.equal(inconnue.theme.palette, undefined);
  const bricolee = validateCreate({
    ...validBody,
    theme: { palette: { "--accent": "url(javascript:alert(1))" } },
  });
  assert.equal(bricolee.theme.palette, undefined);
});

test("paletteIdOf retombe sur la palette par defaut", () => {
  assert.equal(paletteIdOf(undefined), DEFAULT_PALETTE_ID);
  assert.equal(paletteIdOf({ id: "inconnue" }), DEFAULT_PALETTE_ID);
  assert.equal(paletteIdOf({ id: "encre" }), "encre");
});

test("chaque palette definit le meme jeu complet de variables", () => {
  const reference = Object.keys(paletteById(DEFAULT_PALETTE_ID).vars).sort();
  for (const id of ["olive", "encre", "prune"]) {
    assert.deepEqual(Object.keys(paletteById(id).vars).sort(), reference, id);
  }
});

test("validatePatch accepte le nom seul", () => {
  const out = validatePatch({ name: "Noel 2026" });
  assert.deepEqual(Object.keys(out), ["name"]);
});


// --- Occasions, polices, decor ---------------------------------------------

test("validateCreate accepte une occasion connue et active son decor", () => {
  const out = validateCreate({ ...validBody, theme: { occasion: "noel" } });
  assert.equal(out.theme.occasion, "noel");
  assert.equal(out.theme.motif, true);
});

test("validateCreate retombe sur l'occasion neutre si elle est inconnue", () => {
  const out = validateCreate({ ...validBody, theme: { occasion: "halloween" } });
  assert.equal(out.theme.occasion, DEFAULT_OCCASION_ID);
});

test("le decor reste faux pour une occasion qui n'en propose pas", () => {
  const out = validateCreate({ ...validBody, theme: { occasion: "merci", motif: true } });
  assert.equal(occasionById("merci").motif, "none");
  assert.equal(out.theme.motif, false);
});

test("le decor peut etre desactive sur une occasion qui en propose un", () => {
  const out = validateCreate({ ...validBody, theme: { occasion: "noel", motif: false } });
  assert.equal(out.theme.motif, false);
});

test("validateCreate ne garde qu'une police connue", () => {
  assert.equal(validateCreate({ ...validBody, theme: { font: "manuscrit" } }).theme.font, "manuscrit");
  assert.equal(validateCreate({ ...validBody, theme: { font: "comic" } }).theme.font, undefined);
});

test("chaque occasion pointe vers une palette qui existe", () => {
  for (const o of OCCASIONS) {
    assert.equal(paletteById(o.palette).id, o.palette, o.id);
  }
});

test("chaque occasion propose un message d'ouverture non vide", () => {
  for (const o of OCCASIONS) {
    assert.ok(o.intro.trim().length > 0, o.id);
    assert.ok(o.intro.length <= LIMITS.intro, `${o.id} depasse ${LIMITS.intro}`);
  }
});

test("message d'ouverture et signature sont facultatifs mais bornes", () => {
  const out = validateCreate(validBody);
  assert.equal(out.intro_message, "");
  assert.equal(out.signature, "");

  const rempli = validateCreate({
    ...validBody,
    intro_message: "De la part de quelqu'un qui tient a toi",
    signature: "Nathan",
  });
  assert.equal(rempli.signature, "Nathan");

  throwsValidation(() => validateCreate({ ...validBody, intro_message: "x".repeat(81) }), "intro_message");
  throwsValidation(() => validateCreate({ ...validBody, signature: "x".repeat(81) }), "signature");
});

test("validatePatch accepte de vider la signature", () => {
  const out = validatePatch({ signature: "" });
  assert.deepEqual(out, { signature: "" });
});


// --- Voile d'ouverture ------------------------------------------------------

test("le voile d'ouverture est actif par defaut", () => {
  assert.equal(validateCreate(validBody).theme.cover, true);
  assert.equal(validateCreate({ ...validBody, theme: { occasion: "noel" } }).theme.cover, true);
});

test("le voile ne se coupe que sur un refus explicite", () => {
  assert.equal(validateCreate({ ...validBody, theme: { cover: false } }).theme.cover, false);
  // Une valeur bancale ne doit pas desactiver le voile par accident.
  assert.equal(validateCreate({ ...validBody, theme: { cover: "non" } }).theme.cover, true);
  assert.equal(validateCreate({ ...validBody, theme: { cover: 0 } }).theme.cover, true);
});

test("chaque occasion propose une suggestion de titre et de remerciement", () => {
  for (const o of OCCASIONS) {
    assert.ok(o.welcomeHint.trim().length > 0, o.id);
    assert.ok(o.thanksHint.trim().length > 0, o.id);
    assert.ok(o.welcomeHint.length <= LIMITS.message, o.id);
    assert.ok(o.thanksHint.length <= LIMITS.message, o.id);
  }
});

test("les suggestions de titre sont distinctes d'une occasion a l'autre", () => {
  const hints = OCCASIONS.map((o) => o.welcomeHint);
  assert.equal(new Set(hints).size, hints.length);
});


// --- Prenom, photo d'en-tete, revelation, ouverture -------------------------

test("le prenom du receveur est facultatif mais borne", () => {
  assert.equal(validateCreate(validBody).recipient_name, "");
  assert.equal(validateCreate({ ...validBody, recipient_name: "Sophie" }).recipient_name, "Sophie");
  throwsValidation(
    () => validateCreate({ ...validBody, recipient_name: "x".repeat(61) }),
    "recipient_name",
  );
});

test("la photo d'en-tete suit les memes regles que les autres URLs", () => {
  assert.equal(validateCreate(validBody).header_image_url, null);
  assert.equal(
    validateCreate({ ...validBody, header_image_url: "https://cdn.test/h.jpg" }).header_image_url,
    "https://cdn.test/h.jpg",
  );
  throwsValidation(
    () => validateCreate({ ...validBody, header_image_url: "javascript:alert(1)" }),
    "header_image_url",
  );
});

test("la date de revelation est normalisee en ISO", () => {
  assert.equal(validateCreate(validBody).reveal_at, null);
  const out = validateCreate({ ...validBody, reveal_at: "2026-12-25T08:00:00.000Z" });
  assert.equal(out.reveal_at, "2026-12-25T08:00:00.000Z");
  assert.equal(validateCreate({ ...validBody, reveal_at: "" }).reveal_at, null);
});

test("une date de revelation illisible est refusee, pas ignoree", () => {
  throwsValidation(() => validateCreate({ ...validBody, reveal_at: "le 25 decembre" }), "reveal_at");
  throwsValidation(() => validateCreate({ ...validBody, reveal_at: 20261225 }), "reveal_at");
});

test("isSealed suit la date de revelation", () => {
  assert.equal(isSealed({ reveal_at: null }), false);
  assert.equal(isSealed({ reveal_at: new Date(Date.now() + 60_000).toISOString() }), true);
  assert.equal(isSealed({ reveal_at: new Date(Date.now() - 60_000).toISOString() }), false);
});

test("le style d'ouverture retombe sur le voile si inconnu", () => {
  assert.equal(validateCreate(validBody).theme.opening, DEFAULT_OPENING_ID);
  assert.equal(validateCreate({ ...validBody, theme: { opening: "rideau" } }).theme.opening, "rideau");
  assert.equal(
    validateCreate({ ...validBody, theme: { opening: "explosion" } }).theme.opening,
    DEFAULT_OPENING_ID,
  );
});

test("chaque style d'ouverture a un nom et une explication", () => {
  for (const o of OPENINGS) {
    assert.ok(o.name.trim().length > 0, o.id);
    assert.ok(o.hint.trim().length > 0, o.id);
  }
  assert.equal(new Set(OPENINGS.map((o) => o.id)).size, OPENINGS.length);
});

test("validatePatch accepte de retirer la date de revelation", () => {
  assert.deepEqual(validatePatch({ reveal_at: null }), { reveal_at: null });
  assert.deepEqual(validatePatch({ recipient_name: "" }), { recipient_name: "" });
});


// --- Mot du receveur --------------------------------------------------------

test("le mot du receveur est refuse par defaut et s'active explicitement", () => {
  assert.equal(validateCreate(validBody).theme.reply, false);
  assert.equal(validateCreate({ ...validBody, theme: { reply: true } }).theme.reply, true);
  // Une valeur approchante ne doit pas activer l'option par accident.
  assert.equal(validateCreate({ ...validBody, theme: { reply: "oui" } }).theme.reply, false);
  assert.equal(validateCreate({ ...validBody, theme: { reply: 1 } }).theme.reply, false);
});


// --- Bibliotheque d'occasions -----------------------------------------------

test("le socle d'occasions est present", () => {
  const attendues = [
    "aucune", "anniversaire", "noel", "saint-valentin", "naissance",
    "felicitations", "merci", "fete-des-meres", "fete-des-peres", "nouvel-an",
    "mariage", "reussite", "cremaillere", "retraite", "pot-de-depart",
    "animaux",
  ];
  for (const id of attendues) assert.equal(occasionById(id).id, id, id);
  assert.equal(OCCASIONS.length, attendues.length);
});

test("chaque occasion a un nom et un pictogramme uniques", () => {
  const noms = OCCASIONS.map((o) => o.name);
  const icones = OCCASIONS.map((o) => o.icon);
  assert.equal(new Set(noms).size, noms.length, "noms en double");
  assert.equal(new Set(icones).size, icones.length, "pictogrammes en double");
});

test("les mots d'ouverture sont distincts d'une occasion a l'autre", () => {
  const intros = OCCASIONS.map((o) => o.intro);
  assert.equal(new Set(intros).size, intros.length);
});

test("les rubriques couvrent toutes les occasions, sans doublon", () => {
  const ranges = OCCASION_GROUPS.flatMap((g) => g.items.map((o) => o.id));
  assert.equal(ranges.length, OCCASIONS.length, "occasion oubliee ou comptee deux fois");
  assert.deepEqual([...ranges].sort(), OCCASIONS.map((o) => o.id).sort());
});

test("la rubrique sans titre ne contient que l'occasion neutre", () => {
  const sansTitre = OCCASION_GROUPS.find((g) => g.label === null);
  assert.deepEqual(sansTitre?.items.map((o) => o.id), [DEFAULT_OCCASION_ID]);
});

test("aucune rubrique n'est vide", () => {
  for (const g of OCCASION_GROUPS) assert.ok(g.items.length > 0, String(g.label));
});


// --- Titre d'apercu de lien, slug, pilote Postgres --------------------------

test("le texte d'apercu du lien est facultatif mais borne", () => {
  assert.equal(validateCreate(validBody).link_title, "");
  assert.equal(
    validateCreate({ ...validBody, link_title: "Un cadeau t'attend" }).link_title,
    "Un cadeau t'attend",
  );
  throwsValidation(
    () => validateCreate({ ...validBody, link_title: "x".repeat(81) }),
    "link_title",
  );
});

test("validatePatch accepte de vider le texte d'apercu", () => {
  assert.deepEqual(validatePatch({ link_title: "" }), { link_title: "" });
});

test("suggestVariant enchaine des adresses libres et distinctes", () => {
  const base = "noel-de-sophie";
  const variantes = [2, 3, 4].map((n) => suggestVariant(base, n));
  assert.deepEqual(variantes, ["noel-de-sophie-2", "noel-de-sophie-3", "noel-de-sophie-4"]);
  assert.equal(new Set(variantes).size, 3);
  for (const v of variantes) assert.equal(slugError(v), null, v);
});

test("sslFor : TLS pour les hotes distants, rien en local ou reseau interne", () => {
  assert.deepEqual(sslFor("postgres://u:p@ep-truc.eu-central-1.aws.neon.tech/db"), {
    rejectUnauthorized: false,
  });
  assert.deepEqual(sslFor("postgres://u:p@monorail.proxy.rlwy.net:1234/railway"), {
    rejectUnauthorized: false,
  });
  assert.equal(sslFor("postgres://u:p@postgres.railway.internal:5432/railway"), undefined);
  assert.equal(sslFor("postgres://u:p@localhost:5432/mypresentsforyou"), undefined);
  assert.equal(sslFor("pas une url"), undefined);
});

test("chaque police a un identifiant et une variable CSS uniques", () => {
  const ids = FONTS.map((f) => f.id);
  const vars = FONTS.map((f) => f.cssVar);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(vars).size, vars.length);
  for (const f of FONTS) assert.match(f.cssVar, /^var\(--font-[a-z]+\)$/, f.id);
});

test("une police inconnue retombe sur la police par defaut", () => {
  assert.equal(fontById("comic-sans").id, DEFAULT_FONT_ID);
  assert.equal(fontById(undefined).id, DEFAULT_FONT_ID);
  assert.equal(fontById("calligraphie").id, "calligraphie");
});


test("toQuery transforme le gabarit en requete parametree", () => {
  const q = toQuery(["SELECT * FROM t WHERE a = ", " AND b = ", ""], ["x", 2]);
  assert.equal(q.text, "SELECT * FROM t WHERE a = $1 AND b = $2");
  assert.deepEqual(q.values, ["x", 2]);
});

test("toQuery preserve les suffixes de type colles au parametre", () => {
  // `${id}::uuid` et `${json}::jsonb` sont utilises partout dans les routes.
  const q = toQuery(["UPDATE t SET j = ", "::jsonb WHERE id = ", "::uuid"], ["{}", "abc"]);
  assert.equal(q.text, "UPDATE t SET j = $1::jsonb WHERE id = $2::uuid");
});

test("toQuery gere une requete sans parametre", () => {
  const q = toQuery(["SELECT 1"], []);
  assert.equal(q.text, "SELECT 1");
  assert.deepEqual(q.values, []);
});

test("toQuery n'insere jamais la valeur dans le texte", () => {
  const q = toQuery(["SELECT * FROM t WHERE s = ", ""], ["'; DROP TABLE gift_pages; --"]);
  assert.equal(q.text, "SELECT * FROM t WHERE s = $1");
  assert.ok(!q.text.includes("DROP"));
});


test("boot.mjs et lib/db.ts decident du TLS de la meme maniere", () => {
  // Duplication assumee (l'un est bundle par Next, l'autre non) : ce test evite
  // qu'elles divergent en silence.
  for (const url of [
    "postgres://u:p@ep-x.eu-central-1.aws.neon.tech/db",
    "postgres://u:p@monorail.proxy.rlwy.net:1234/railway",
    "postgres://u:p@postgres.railway.internal:5432/railway",
    "postgres://u:p@localhost:5432/mypresentsforyou",
    "pas une url",
  ]) {
    assert.deepEqual(bootSslFor(url), sslFor(url), url);
  }
});

/*
 * Meme raison que pour sslFor : boot.mjs tourne avant Next et ne peut pas
 * importer un module TypeScript, il redit donc le calcul. Si les deux divergent,
 * la verification du demarrage annonce un dossier et l'application ecrit dans un
 * autre — exactement le silence qu'elle est censee rompre.
 *
 * `MEDIA_DIR` est lu au chargement du module cote TypeScript : on ne compare donc
 * que le cas par defaut, le seul que ce harnais puisse observer.
 */
test("boot.mjs et mediaStore designent le meme dossier d'images", () => {
  assert.equal(process.env.MEDIA_DIR ?? "", "", "MEDIA_DIR doit etre absent pour ce test");
  assert.equal(bootMediaDir(), MEDIA_DIR);
});

// --- Textes des trois ecrans -----------------------------------------------

test("validateCreate accepte et borne les quatre textes d'ecran", () => {
  const out = validateCreate({
    ...validBody,
    open_label: "  Ouvrir mon cadeau  ",
    wait_message: "  Rendez-vous le jour J.  ",
    items_title: "  À toi de choisir  ",
    items_message: "  Choisis celui qui te plaît.  ",
  });
  assert.equal(out.open_label, "Ouvrir mon cadeau");
  assert.equal(out.wait_message, "Rendez-vous le jour J.");
  assert.equal(out.items_title, "À toi de choisir");
  assert.equal(out.items_message, "Choisis celui qui te plaît.");
});

test("validateCreate laisse les quatre textes vides quand ils sont absents", () => {
  const out = validateCreate({ ...validBody });
  assert.equal(out.open_label, "");
  assert.equal(out.wait_message, "");
  assert.equal(out.items_title, "");
  assert.equal(out.items_message, "");
});

for (const [field, limit] of [
  ["open_label", LIMITS.openLabel],
  ["wait_message", LIMITS.waitMessage],
  ["items_title", LIMITS.itemsTitle],
  ["items_message", LIMITS.itemsMessage],
] as const) {
  test(`validateCreate refuse un ${field} trop long`, () => {
    throwsValidation(() => validateCreate({ ...validBody, [field]: "x".repeat(limit + 1) }), field);
  });

  test(`validatePatch borne aussi ${field}`, () => {
    throwsValidation(() => validatePatch({ [field]: "x".repeat(limit + 1) }), field);
  });
}

test("validatePatch ne renvoie que les textes d'ecran fournis", () => {
  const out = validatePatch({ items_title: "Choisis" });
  assert.deepEqual(Object.keys(out), ["items_title"]);
  assert.equal(out.items_title, "Choisis");
});

test("chaque occasion propose un texte de bouton et un mot d'attente", () => {
  for (const o of OCCASIONS) {
    assert.ok(o.openHint.trim().length > 0, `openHint vide : ${o.id}`);
    assert.ok(o.waitHint.trim().length > 0, `waitHint vide : ${o.id}`);
    assert.ok(
      o.openHint.length <= LIMITS.openLabel,
      `openHint dépasse la limite du champ : ${o.id}`,
    );
    assert.ok(
      o.waitHint.length <= LIMITS.waitMessage,
      `waitHint dépasse la limite du champ : ${o.id}`,
    );
  }
});

test("les suggestions communes tiennent dans leurs champs", () => {
  assert.ok(ITEMS_TITLE_HINT.length <= LIMITS.itemsTitle);
  assert.ok(ITEMS_MESSAGE_HINT.length <= LIMITS.itemsMessage);
});

// --- Fenetre du mot du receveur --------------------------------------------

test("le mot n'est recevable qu'apres un choix", () => {
  assert.equal(replyWindowOpen({ chosen_at: null }), false);
});

test("le mot est recevable juste apres le choix", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  assert.equal(replyWindowOpen({ chosen_at: "2026-03-01T11:59:00Z" }, now), true);
});

test("le mot n'est plus recevable une fois la fenetre passee", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  const trop = new Date(now.getTime() - REPLY_WINDOW_MS - 1000).toISOString();
  assert.equal(replyWindowOpen({ chosen_at: trop }, now), false);
});

test("la borne exacte de la fenetre reste recevable", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  const pile = new Date(now.getTime() - REPLY_WINDOW_MS).toISOString();
  assert.equal(replyWindowOpen({ chosen_at: pile }, now), true);
});

// --- Ouvertures et effets --------------------------------------------------

test("chaque ouverture a un identifiant unique, un nom et une description", () => {
  const ids = OPENINGS.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length, "identifiants dupliques");
  for (const o of OPENINGS) {
    assert.ok(o.name.trim().length > 0, `nom vide : ${o.id}`);
    assert.ok(o.hint.trim().length > 0, `description vide : ${o.id}`);
  }
});

test("chaque effet a un identifiant unique, un nom et une description", () => {
  const ids = EFFECTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "identifiants dupliques");
  for (const e of EFFECTS) {
    assert.ok(e.name.trim().length > 0, `nom vide : ${e.id}`);
    assert.ok(e.hint.trim().length > 0, `description vide : ${e.id}`);
  }
});

test("les valeurs par defaut d'ouverture et d'effet existent bien", () => {
  assert.equal(openingById(DEFAULT_OPENING_ID).id, DEFAULT_OPENING_ID);
  assert.equal(effectById(DEFAULT_EFFECT_ID).id, DEFAULT_EFFECT_ID);
});

test("un identifiant inconnu retombe sur la valeur par defaut", () => {
  assert.equal(openingById("rideau-de-fer").id, DEFAULT_OPENING_ID);
  assert.equal(effectById("feux-d-artifice").id, DEFAULT_EFFECT_ID);
  assert.equal(openingById(null).id, DEFAULT_OPENING_ID);
  assert.equal(effectById(undefined).id, DEFAULT_EFFECT_ID);
});

test("l'effet propose par chaque occasion existe", () => {
  for (const o of OCCASIONS) {
    assert.equal(effectById(o.effect).id, o.effect, `effet inconnu : ${o.id}`);
  }
});

test("validateTheme ne garde qu'une ouverture et un effet connus", () => {
  const ok = validateTheme({ opening: "enveloppe", effect: "confettis" });
  assert.equal(ok.opening, "enveloppe");
  assert.equal(ok.effect, "confettis");

  const ko = validateTheme({ opening: "<script>", effect: { toString: () => "neige" } });
  assert.equal(ko.opening, DEFAULT_OPENING_ID);
  assert.equal(ko.effect, DEFAULT_EFFECT_ID);
});

test("l'effet ne depend pas du voile : il survit a cover false", () => {
  const t = validateTheme({ cover: false, effect: "neige" });
  assert.equal(t.cover, false);
  assert.equal(t.effect, "neige");
});

// --- Limitation de debit ---------------------------------------------------

/*
 * L'horloge est injectee : ces verifications ne dorment pas, elles avancent le
 * temps a la main. Un test de debit qui attend vraiment dix minutes ne serait
 * jamais lance.
 */
const QUOTA_TEST = { limite: 3, fenetreMs: 3000 };

test("le quota laisse passer jusqu'a la limite, puis refuse", () => {
  const lim = creerLimiteur();
  for (let i = 0; i < QUOTA_TEST.limite; i++) {
    assert.equal(lim.consomme(QUOTA_TEST, "a", 0).ok, true, `passage ${i + 1}`);
  }
  assert.equal(lim.consomme(QUOTA_TEST, "a", 0).ok, false);
});

test("le credit se reconstitue avec le temps", () => {
  const lim = creerLimiteur();
  for (let i = 0; i < QUOTA_TEST.limite; i++) lim.consomme(QUOTA_TEST, "a", 0);
  assert.equal(lim.consomme(QUOTA_TEST, "a", 0).ok, false);

  // Un tiers de la fenetre rend exactement un jeton.
  assert.equal(lim.consomme(QUOTA_TEST, "a", 1000).ok, true);
  assert.equal(lim.consomme(QUOTA_TEST, "a", 1000).ok, false);
});

test("le credit ne depasse jamais la limite, meme apres une longue pause", () => {
  const lim = creerLimiteur();
  lim.consomme(QUOTA_TEST, "a", 0);
  const bienPlusTard = QUOTA_TEST.fenetreMs * 100;
  for (let i = 0; i < QUOTA_TEST.limite; i++) {
    assert.equal(lim.consomme(QUOTA_TEST, "a", bienPlusTard).ok, true);
  }
  assert.equal(lim.consomme(QUOTA_TEST, "a", bienPlusTard).ok, false);
});

test("attendre le delai annonce debloque effectivement", () => {
  const lim = creerLimiteur();
  for (let i = 0; i < QUOTA_TEST.limite; i++) lim.consomme(QUOTA_TEST, "a", 0);
  const refus = lim.consomme(QUOTA_TEST, "a", 0);
  assert.equal(refus.ok, false);
  assert.ok(!refus.ok && refus.retryAfterS >= 1);
  assert.ok(!refus.ok && lim.consomme(QUOTA_TEST, "a", refus.retryAfterS * 1000).ok);
});

test("marteler la route ne repousse pas la recharge", () => {
  const lim = creerLimiteur();
  for (let i = 0; i < QUOTA_TEST.limite; i++) lim.consomme(QUOTA_TEST, "a", 0);
  // Cent refus entre 0 et 999 ms ne doivent pas decaler le retour du credit.
  for (let t = 0; t < 1000; t += 10) lim.consomme(QUOTA_TEST, "a", t);
  assert.equal(lim.consomme(QUOTA_TEST, "a", 1000).ok, true);
});

test("deux cles ont des compteurs independants", () => {
  const lim = creerLimiteur();
  for (let i = 0; i < QUOTA_TEST.limite; i++) lim.consomme(QUOTA_TEST, "a", 0);
  assert.equal(lim.consomme(QUOTA_TEST, "a", 0).ok, false);
  assert.equal(lim.consomme(QUOTA_TEST, "b", 0).ok, true);
});

test("la table des compteurs reste bornee malgre des cles qui tournent", () => {
  // Le vecteur : faire tourner l'adresse source pour faire enfler la memoire.
  const lim = creerLimiteur(50);
  for (let i = 0; i < 5000; i++) lim.consomme(QUOTA_TEST, `ip-${i}`, i);
  assert.ok(lim.taille() <= 50, `${lim.taille()} entrees`);
});

test("l'eviction ne rend pas son credit a une cle active", () => {
  const lim = creerLimiteur(50);
  for (let i = 0; i < QUOTA_TEST.limite; i++) lim.consomme(QUOTA_TEST, "abuseur", 0);
  // L'abuseur reste le plus recemment vu tant qu'il insiste : le balayage jette
  // les compteurs pleins et les plus anciens, pas lui.
  for (let i = 0; i < 500; i++) {
    lim.consomme(QUOTA_TEST, `bruit-${i}`, 1);
    lim.consomme(QUOTA_TEST, "abuseur", 1);
  }
  assert.equal(lim.consomme(QUOTA_TEST, "abuseur", 1).ok, false);
});

test("les quotas reels sont coherents", () => {
  for (const [nom, q] of Object.entries(QUOTAS)) {
    assert.ok(q.limite > 0, nom);
    assert.ok(q.fenetreMs > 0, nom);
  }
  // Le plafond global doit laisser passer plusieurs personnes distinctes,
  // sinon le premier venu ferme la creation a tout le monde.
  assert.ok(QUOTAS.creationGlobale.limite >= QUOTAS.creation.limite * 5);
});

test("adresseClient prefere les en-tetes poses par l'hebergeur", () => {
  const req = new Request("https://exemple.test", {
    headers: { "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
  });
  assert.equal(adresseClient(req), "9.9.9.9");
});

test("adresseClient retient le premier maillon de x-forwarded-for", () => {
  const req = new Request("https://exemple.test", {
    headers: { "x-forwarded-for": "  1.1.1.1 , 2.2.2.2 " },
  });
  assert.equal(adresseClient(req), "1.1.1.1");
});

test("adresseClient a un repli quand aucun en-tete n'est pose", () => {
  assert.equal(adresseClient(new Request("https://exemple.test")), "sans-adresse");
});

// --- Habillage de la carte imprimable --------------------------------------

/*
 * La liste des decors, ecrite ici a la main et non importee de `lib/occasions`.
 *
 * C'est tout l'interet : elle vient d'ailleurs que la source, donc un decor
 * ajoute d'un cote et oublie de l'autre se voit. L'importer ferait passer les
 * deux tests ci-dessous quoi qu'il arrive.
 */
const DECORS = [
  "none",
  "confetti",
  "flocons",
  "coeurs",
  "etoiles",
  "guirlande",
  "feuilles",
  "pattes",
  "pieds",
  "bougies",
  "cadeaux",
  "alliances",
];

test("les identifiants de disposition et de motif sont uniques", () => {
  const dispositions = PRINT_LAYOUTS.map((l) => l.id);
  assert.equal(new Set(dispositions).size, dispositions.length);
  const motifs = PRINT_MOTIFS.map((m) => m.id);
  assert.equal(new Set(motifs).size, motifs.length);
});

test("chaque entree porte un nom, et chaque motif un decor connu", () => {
  for (const l of PRINT_LAYOUTS) assert.ok(l.nom.trim().length > 0, l.id);
  for (const m of PRINT_MOTIFS) {
    assert.ok(m.nom.trim().length > 0, m.id);
    assert.ok(DECORS.includes(m.id), `motif inconnu : ${m.id}`);
  }
});

test("GiftMotif sait dessiner chaque decor du catalogue", () => {
  /*
   * Un `MotifKind` ajoute sans son `case` compile sans broncher et rend un
   * `<pattern>` vide : le decor est proposable, selectionnable, et invisible.
   * Le composant est lu comme du texte, faute de rendu React dans ce harnais —
   * ce qui suffit a attraper l'oubli.
   */
  const source = readFileSync(new URL("../components/GiftMotif.tsx", import.meta.url), "utf8");
  for (const d of DECORS) {
    if (d === "none") continue;
    assert.ok(source.includes(`case "${d}":`), `aucun trace pour ${d}`);
  }
});

test("chaque occasion pointe vers un decor connu", () => {
  for (const o of OCCASIONS) {
    assert.ok(DECORS.includes(o.motif), `${o.id} : decor ${o.motif}`);
  }
});

test("les motifs couvrent tous ceux que GiftMotif sait dessiner", () => {
  // Un decor ajoute a la page-cadeau et oublie ici serait dessinable mais
  // inatteignable au carrousel.
  for (const d of DECORS) {
    assert.ok(
      PRINT_MOTIFS.some((m) => m.id === d),
      `${d} absent du carrousel`,
    );
  }
});

test("les dispositions retirees le restent", () => {
  /*
   * « bandeau » : son aplat etait pose en `::before` sans `z-index`, il passait
   * derriere le titre qu'il devait souligner. « cadre » : retiree sur demande,
   * le decor de fond faisant mieux le meme travail depuis qu'on en regle la
   * taille et le contraste. Les remettre par inadvertance rendrait un defaut
   * signale, ou un choix defait.
   */
  for (const parti of ["bandeau", "cadre"]) {
    assert.ok(
      !PRINT_LAYOUTS.some((l) => (l.id as string) === parti),
      `${parti} de retour`,
    );
  }
});

test("stepPrintMotif avance, recule et boucle", () => {
  const premier = PRINT_MOTIFS[0].id;
  const dernier = PRINT_MOTIFS[PRINT_MOTIFS.length - 1].id;
  assert.equal(stepPrintMotif(premier, 1), PRINT_MOTIFS[1].id);
  assert.equal(stepPrintMotif(premier, -1), dernier);
  assert.equal(stepPrintMotif(dernier, 1), premier);
  // Deux clics rapproches doivent avancer de deux : c'est tout l'interet de
  // calculer a partir du motif courant plutot que d'un index memorise.
  assert.equal(stepPrintMotif(stepPrintMotif(premier, 1), 1), PRINT_MOTIFS[2].id);
  // Un identifiant inconnu part du defaut plutot que de sortir de la liste.
  assert.equal(stepPrintMotif(null, 1), PRINT_MOTIFS[1].id);
});

test("les replis ne renvoient jamais undefined", () => {
  assert.equal(printLayoutById("inconnu").id, DEFAULT_PRINT_LAYOUT);
  assert.equal(printLayoutById("").id, DEFAULT_PRINT_LAYOUT);
  assert.equal(printLayoutById(undefined).id, DEFAULT_PRINT_LAYOUT);
  assert.equal(printLayoutById(PRINT_LAYOUTS[1].id).id, PRINT_LAYOUTS[1].id);
  assert.equal(printMotifIndex(null), 0);
  assert.equal(PRINT_MOTIFS[printMotifIndex(null)].id, DEFAULT_PRINT_MOTIF);
});

// --- Couleur de la carte ----------------------------------------------------

test("le rond-point hex vers HSL et retour conserve la couleur", () => {
  for (const p of PALETTES) {
    const hex = p.vars["--accent"];
    const hsl = hexToHsl(hex);
    assert.ok(hsl, p.id);
    assert.equal(hslToHex(hsl!).toLowerCase(), hex.toLowerCase(), p.id);
  }
});

test("hexToHsl refuse ce qui n'est pas une couleur", () => {
  for (const mauvais of ["", "#12345", "rouge", "#gggggg", "rgb(1,2,3)"]) {
    assert.equal(hexToHsl(mauvais), null, mauvais);
  }
});

test("le curseur sur la teinte du theme ne surcharge rien", () => {
  // Reecrire les memes couleurs a un arrondi pres ferait deriver une carte qu'on
  // n'a pas touchee. Sur sa valeur de depart, le curseur doit etre transparent.
  for (const p of PALETTES) {
    const palette = { id: p.id };
    assert.deepEqual(styleDeTeinte(palette, teinteDuTheme(palette)), {}, p.id);
  }
});

test("le curseur amene tout sur une seule teinte, sans toucher au reste", () => {
  /*
   * L'invariant tient en deux moities.
   *
   * Toutes les variables teintees sortent sur *la meme* teinte, celle du
   * curseur : c'est ce qui fait une couleur de carte plutot que cinq couleurs
   * decalees les unes des autres. Et chacune garde sa propre saturation et sa
   * propre clarte, ce qui garde la carte dans le registre papier du site au lieu
   * de la faire virer au fluo.
   */
  for (const p of PALETTES) {
    const palette = { id: p.id };
    const cible = (teinteDuTheme(palette) + 120) % 360;
    const style = styleDeTeinte(palette, cible) as Record<string, string>;
    assert.ok(Object.keys(style).length > 0, p.id);

    for (const [nom, valeur] of Object.entries(style)) {
      const avant = hexToHsl(p.vars[nom])!;
      const apres = hexToHsl(valeur)!;
      assert.ok(Math.abs(avant.s - apres.s) < 0.02, `${p.id} ${nom} saturation`);
      assert.ok(Math.abs(avant.l - apres.l) < 0.02, `${p.id} ${nom} clarte`);

      /*
       * La tolerance sur la teinte suit le chroma. Une couleur pale — `--line`,
       * `--accent-soft` — n'occupe qu'une dizaine de niveaux sur 255 : la teinte
       * s'y quantifie par paliers de plusieurs degres, et l'exiger au degre pres
       * n'aurait rien teste d'autre que l'arrondi 8 bits. Le pire ecart mesure
       * sur les huit palettes et les 359 rotations vaut 30 une fois multiplie
       * par le chroma ; la marge est prise au double.
       */
      const chroma = (1 - Math.abs(2 * avant.l - 1)) * avant.s * 255;
      const marge = Math.max(1.5, 60 / Math.max(chroma, 1));
      const ecart = Math.min(Math.abs(apres.h - cible), 360 - Math.abs(apres.h - cible));
      assert.ok(ecart < marge, `${p.id} ${nom} : ${ecart.toFixed(1)}° > ${marge.toFixed(1)}°`);
    }
  }
});

test("une teinte hors bornes revient dans le tour", () => {
  const palette = { id: "olive" };
  const depart = teinteDuTheme(palette);
  assert.deepEqual(styleDeTeinte(palette, depart + 360), {});
  assert.deepEqual(styleDeTeinte(palette, depart - 360), {});
});

// --- Reduction des images --------------------------------------------------

/*
 * `sharp` est natif et asynchrone, alors que ce harnais est synchrone : ces
 * verifications tournent donc a part, juste avant le rapport.
 */
async function checkImages() {
  const big = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: { r: 200, g: 120, b: 80 } },
  })
    .jpeg()
    .toBuffer();

  const reduit = await shrinkImage(big, "image/jpeg");
  const meta = await sharp(reduit.data).metadata();
  test("une image trop grande est ramenee au cote le plus long", () => {
    assert.equal(Math.max(meta.width ?? 0, meta.height ?? 0), MAX_IMAGE_EDGE);
  });
  test("la reduction preserve les proportions", () => {
    assert.equal(meta.width, MAX_IMAGE_EDGE);
    assert.equal(meta.height, Math.round((MAX_IMAGE_EDGE * 1800) / 2400));
  });
  test("la reduction preserve le format", () => {
    assert.equal(reduit.contentType, "image/jpeg");
    assert.equal(meta.format, "jpeg");
  });
  test("la reduction allege le fichier", () => {
    assert.ok(reduit.data.length < big.length, `${reduit.data.length} >= ${big.length}`);
  });

  const petit = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
  const intact = await shrinkImage(petit, "image/png");
  test("une image deja assez petite n'est pas reencodee", () => {
    assert.ok(intact.data.equals(petit));
    assert.equal(intact.contentType, "image/png");
  });

  const pourri = Buffer.from("ceci n'est pas une image");
  const repli = await shrinkImage(pourri, "image/jpeg");
  test("une donnee illisible ressort telle quelle", () => {
    assert.ok(repli.data.equals(pourri));
    assert.equal(repli.contentType, "image/jpeg");
  });
}

// --- Feuille de style : les reglages qu'un refactor casse sans bruit ---------

/*
 * Trois defauts signales par les receveurs venaient tous d'une propriete CSS,
 * invisible a la relecture et sans effet sur le typage ni sur la compilation.
 * Ils sont fixes ici pour qu'un retour en arriere se voie tout de suite.
 */
{
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const impression = readFileSync(new URL("../app/print.css", import.meta.url), "utf8");
  const bloc = (selecteur: string) => {
    const i = css.indexOf(`\n${selecteur} {`);
    assert.notEqual(i, -1, `regle absente : ${selecteur}`);
    return css.slice(i, css.indexOf("\n}", i));
  };

  test("les effets sont ancres a la fenetre, pas au document", () => {
    // En `absolute`, les particules partaient d'un bord de la page haute de
    // plusieurs ecrans : avec vingt cadeaux, zero particule sur vingt-six etait
    // visible depuis le haut de la page. En `fixed`, les vingt-six le sont.
    assert.match(bloc(".fx"), /position: fixed;/);
  });

  test("la carte ne rogne pas son propre anneau de selection", () => {
    // `overflow: hidden` sur la carte soumettait l'anneau au meme masque arrondi
    // que la vignette. Le rognage appartient a la vignette seule.
    assert.doesNotMatch(bloc(".card"), /overflow: hidden;/);
    assert.match(bloc(".thumb"), /overflow: hidden;/);
  });

  test("le soulevement au survol epargne les ecrans tactiles", () => {
    // Sur tactile, `:hover` reste colle apres le doigt : la carte se repeignait
    // pendant 0,22 s, flou de la photo compris.
    assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{\n\s+\.card \{/);
  });

  test("les entrees en scene n'empruntent pas la courbe des reactions", () => {
    /*
     * `--ease` franchit la moitie de son parcours en 16 % de la duree : parfait
     * pour un bouton qui repond, ruineux pour une mise en scene, ou la duree
     * declaree ne se voit alors nulle part. Les trois arrivees — les lignes du
     * voile, les deux titres, les cartes — passent par `--ease-entree`.
     */
    assert.match(css, /--ease-entree: cubic-bezier\(/);
    for (const regle of [
      /animation: cover-rise var\(--voile-duree\) var\(--ease-entree\)/,
      /animation: titre-entree var\(--titre-duree\) var\(--ease-entree\)/,
      /animation: card-rise var\(--reveal-duration\) var\(--ease-entree\)/,
    ]) {
      assert.match(css, regle, `entree encore sur --ease : ${regle}`);
    }
  });

  test("le titre du voile ne suit plus la duree de celui des cadeaux", () => {
    /*
     * `--titre-duree` est aussi celle du titre de l'ecran des cadeaux, et
     * GiftView compte REVEAL_APRES_TITRE_MS avant de lancer la cascade :
     * rebrancher le voile dessus ferait repartir les deux ensemble, et etirer
     * l'un ferait partir les cartes pendant que l'autre bouge encore.
     */
    assert.match(css, /--voile-titre-duree: \d/);
    assert.match(css, /animation-duration: var\(--voile-titre-duree\);/);
    assert.doesNotMatch(css, /\.cover__title \{[^}]*var\(--titre-duree\)/);
  });

  test("le titre du voile est precede d'un silence", () => {
    /*
     * A cadence reguliere, le titre arrivait comme une troisieme ligne de liste
     * et chevauchait le mot d'ouverture de 180 ms. `--voile-souffle` s'ajoute au
     * pas devant lui seul, et le bouton le repercute pour ne pas se rapprocher.
     */
    assert.match(css, /--voile-souffle: \d/);
    assert.match(
      css,
      /\.cover__title \{\n\s+animation-delay: calc\(0\.2s \+ 2 \* var\(--voile-pas\) \+ var\(--voile-souffle\)\);/,
    );
    assert.match(css, /\.cover__wait \{[\s\S]{0,1400}?var\(--voile-souffle\) \+ [\d.]+s\)/);
  });

  test("le decor reste reglable sans changer la page-cadeau", () => {
    /*
     * La carte imprimable regle l'opacite du decor ; la page-cadeau, elle, ne
     * pose rien. Le repli de la variable doit donc valoir exactement l'ancienne
     * valeur en dur, sans quoi toutes les pages deja creees changeraient
     * d'apparence pour un reglage qui ne les concerne pas.
     */
    const i = css.indexOf("\n.motif {");
    assert.notEqual(i, -1, "regle .motif absente");
    const regle = css.slice(i, css.indexOf("\n}", i));
    assert.match(regle, /opacity: var\(--motif-opacite, 0\.11\);/);
  });

  test("le README connait tous les effets et tous les decors", () => {
    /*
     * La documentation derive en silence, et l'a fait : elle a annonce « dix
     * modeles », « huit palettes » et « quinze occasions » longtemps apres que
     * ces nombres aient change. Compter serait fragile a la reformulation ; on
     * verifie donc que chaque nom du catalogue apparait quelque part, ce qui
     * attrape le vrai defaut — un effet ou un decor ajoute sans un mot.
     */
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8").toLowerCase();
    for (const e of EFFECTS) {
      if (e.id === "aucun") continue;
      assert.ok(readme.includes(e.name.toLowerCase()), `effet absent du README : ${e.name}`);
    }
    for (const m of PRINT_MOTIFS) {
      if (m.id === "none") continue;
      assert.ok(readme.includes(m.nom.toLowerCase()), `decor absent du README : ${m.nom}`);
    }
  });

  test("l'occasion est la premiere des trois etapes", () => {
    /*
     * L'occasion est un preset : la choisir repose palette, decor, effet et
     * formulations de depart. Posee apres la saisie, elle ecrase ce qu'on vient
     * d'ecrire — `chooseOccasion` porte encore la rustine qui n'efface le
     * message que s'il valait toujours le defaut precedent.
     *
     * Le selecteur doit donc rester dans l'etape 1, avant le marqueur de
     * l'etape des cadeaux.
     */
    const editeur = readFileSync(
      new URL("../components/editor/PageEditor.tsx", import.meta.url),
      "utf8",
    );
    const selecteur = editeur.indexOf('className="occasion-groups"');
    const cadeaux = editeur.indexOf("{step === 2 && (");
    const presentation = editeur.indexOf("{step === 3 && (");
    assert.notEqual(selecteur, -1, "selecteur d'occasion absent");
    assert.notEqual(cadeaux, -1, "etape des cadeaux absente");
    assert.notEqual(presentation, -1, "etape de presentation absente");
    assert.ok(selecteur < cadeaux, "le selecteur d'occasion a quitte la premiere etape");
    assert.ok(cadeaux < presentation, "les cadeaux doivent preceder la presentation");
  });

  test("la barre d'action porte des cibles tactiles et des bords visibles", () => {
    /*
     * Deux defauts mesures, et rien dans le code ne les designait.
     *
     * Les boutons secondaires heritaient de `.btn--sm`, soit 40 px de haut,
     * contre les 44 px minimum d'une cible tactile (WCAG 2.5.8) — et ils vivent
     * au bord bas de l'ecran, serres contre l'action principale, la ou le pouce
     * vise le moins bien. Leur bord etait `--line` : 1,23:1 de contraste avec le
     * papier quand la regle 1.4.11 en demande 3:1. Autrement dit, une cible trop
     * petite et sans contour visible, juste a cote du bouton qui cree la page.
     *
     * On lit la regle comme du texte : `getComputedStyle` demanderait un
     * navigateur, et le harnais tourne sans.
     */
    const css = readFileSync(new URL("../app/editor.css", import.meta.url), "utf8");
    const bloc = /\.editor__nav \.btn \{([^}]*)\}/.exec(css);
    assert.ok(bloc, "regle .editor__nav .btn introuvable");

    const hauteur = /min-height:\s*([\d.]+)rem/.exec(bloc[1]);
    assert.ok(hauteur, "les boutons de navigation n'imposent plus de hauteur minimale");
    assert.ok(
      Number(hauteur[1]) * 16 >= 44,
      `cible tactile de ${Number(hauteur[1]) * 16} px, minimum 44`,
    );

    /*
     * `--line` est le token qui plafonnait a 1,23:1. Le reste du depot s'en sert
     * legitimement pour des filets ; ici, sur le bord d'une commande, il est le
     * defaut exact qu'on vient de corriger.
     */
    const bord = /border-color:\s*var\((--[a-z-]+)\)/.exec(bloc[1]);
    assert.ok(bord, "les boutons de navigation n'imposent plus de couleur de bord");
    assert.notEqual(bord[1], "--line", "bord revenu a --line, invisible sur le papier");

    /*
     * L'ecart qui separe le groupe secondaire de l'action principale. A 1440 il
     * valait 10 px : viser « Apercu » et manquer d'un demi-pouce vers la droite
     * declenchait « Creer la page ». Les deux axes comptent — la barre passe a
     * deux rangees sous 62 rem, et l'ecart change alors de nom.
     */
    const barre = /\.editor__actions \{([^}]*)\}/.exec(css);
    assert.ok(barre, "regle .editor__actions introuvable");
    for (const axe of ["column-gap", "row-gap"]) {
      const m = new RegExp(`${axe}:\\s*([\\d.]+)rem`).exec(barre[1]);
      assert.ok(m, `la barre d'action n'impose plus de ${axe}`);
      assert.ok(
        Number(m[1]) * 16 >= 16,
        `${axe} de ${Number(m[1]) * 16} px entre les commandes, minimum 16`,
      );
    }
  });

  test("l'ecran de creation ramene a l'editeur", () => {
    /*
     * Le bouton « Creer la page » se touche par erreur en visant « Apercu »,
     * juste a cote dans la barre d'action. L'ecran qui suit n'offrait alors
     * aucun retour : le formulaire avait disparu et rien ne disait que tout
     * restait modifiable.
     *
     * Le retour passe par une ancre nommee dans l'administration, ou vit
     * l'editeur. Les deux moities se verifient ensemble : un lien vers une ancre
     * absente ne casse rien de visible, il depose seulement le donneur en haut
     * d'une page ou il n'a rien a faire.
     */
    const flux = readFileSync(new URL("../components/CreateFlow.tsx", import.meta.url), "utf8");
    assert.ok(
      flux.includes("#modifier"),
      "l'ecran « Ta page est prete » ne renvoie plus a l'editeur",
    );

    const admin = readFileSync(new URL("../components/AdminView.tsx", import.meta.url), "utf8");
    assert.ok(admin.includes('id="modifier"'), "l'ancre #modifier a disparu de l'administration");
  });

  test("l'ancien nom du site ne traine plus dans les sources", () => {
    /*
     * Le site a ete renomme, et un renommage se rate par les bords.
     *
     * Le premier passage n'a couvert que .tsx/.ts/.css/.json/.md : il a laisse
     * l'ancien nom dans `scripts/boot.mjs` (onze lignes de journal), dans
     * `scripts/brand.mjs` (donc dans `app/icon.svg`, qui en est engendre) et dans
     * `db/schema.sql`. Aucun de ces trois ne casse quoi que ce soit — c'est bien
     * le probleme : rien ne s'en serait plaint.
     *
     * Les deux cles de `localStorage` d'avant le renommage sont les seules
     * exceptions permises : elles doivent porter l'ancien nom, sans quoi les
     * brouillons deja ecrits sur les appareils deviennent illisibles.
     */
    const racines = ["app", "components", "lib", "scripts", "db"];
    const suffixes = [".ts", ".tsx", ".css", ".mjs", ".sql", ".svg", ".json"];
    const permis = ["givly:brouillon", "givly:carte:"];

    const fichiers: string[] = [];
    const descendre = (dossier: string) => {
      for (const e of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = `${dossier}/${e.name}`;
        if (e.isDirectory()) descendre(chemin);
        // Ce fichier-ci s'exclut : il doit citer l'ancien nom pour le chercher.
        else if (chemin === "scripts/check.ts") continue;
        else if (suffixes.some((f) => e.name.endsWith(f))) fichiers.push(chemin);
      }
    };
    for (const r of racines) descendre(r);
    assert.ok(fichiers.length > 40, `parcours trop court : ${fichiers.length} fichiers`);

    for (const chemin of fichiers) {
      let contenu = readFileSync(chemin, "utf8");
      for (const p of permis) contenu = contenu.split(p).join("");
      assert.ok(
        !/givly/i.test(contenu),
        `l'ancien nom du site subsiste dans ${chemin}`,
      );
    }
  });

  test("le README annonce le bon nombre d'etapes", () => {
    /*
     * Le nombre d'etapes est ecrit en toutes lettres a trois endroits du README,
     * et il vient de derailler : l'assistant est passe a trois etapes pendant
     * que la doc en annonçait encore deux, dans la carte du code comme dans la
     * section « Ce qui est personnalisable ». Rien ne s'en plaignait.
     *
     * On compte les entrees de `STEPS` dans l'editeur — la source — et on exige
     * que le README emploie le meme mot. La forme « du temps des deux etapes »
     * reste permise : elle raconte l'ancien decoupage, elle ne l'annonce pas.
     */
    const editeur = readFileSync(
      new URL("../components/editor/PageEditor.tsx", import.meta.url),
      "utf8",
    );
    const bloc = /const STEPS = \[(.*?)\] as const;/s.exec(editeur);
    assert.ok(bloc, "tableau STEPS introuvable dans l'editeur");
    const combien = (bloc[1].match(/\{ n: \d+,/g) ?? []).length;
    assert.ok(combien >= 2, "STEPS parait vide");

    const mots: Record<number, string> = { 2: "deux", 3: "trois", 4: "quatre" };
    const attendu = mots[combien];
    assert.ok(attendu, `pas de mot pour ${combien} etapes`);

    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const annonces = readme.match(/en \*{0,2}(deux|trois|quatre)\*{0,2} étapes/g) ?? [];
    assert.ok(annonces.length >= 2, "le README n'annonce plus le nombre d'etapes");
    for (const a of annonces) {
      assert.ok(a.includes(attendu), `le README annonce « ${a} » pour ${combien} etapes`);
    }
  });

  test("chaque effet du catalogue est dessine quelque part", () => {
    /*
     * `GiftEffect` pose une classe `fx--<id>` sur un calque de spans vides et
     * s'arrete la : sans regle correspondante, l'effet est proposable, activable,
     * et absolument invisible. Meme piege que pour les decors, mais du cote CSS.
     */
    for (const e of EFFECTS) {
      if (e.id === "aucun") continue;
      /*
       * L'accolade compte : `.fx--notes span:nth-child(odd)` contient
       * `.fx--notes span`, et sans elle la verification passait alors meme que
       * la regle de base avait ete renommee. Verifie par mutation.
       */
      assert.ok(css.includes(`.fx--${e.id} span {`), `aucune regle pour l'effet ${e.id}`);
    }
  });

  test("le decor court d'un bord a l'autre de la feuille", () => {
    /*
     * Un `<pattern>` commence son pavage au coin du dessin qui le porte. Un
     * decor par panneau faisait donc repartir la tuile a zero au milieu de la
     * feuille, et le motif se cassait net sur le pli. Il en faut un seul, pose
     * sur la feuille elle-meme.
     */
    for (const fichier of ["PrintableCard", "CardPreview"]) {
      const source = readFileSync(
        new URL(`../components/${fichier}.tsx`, import.meta.url),
        "utf8",
      );
      const decors = source.match(/<GiftMotif /g) ?? [];
      assert.equal(decors.length, 1, `${fichier} : ${decors.length} decors au lieu d'un`);
    }
  });

  test("l'atelier garde la carte a l'ecran avec ses reglages", () => {
    /*
     * Trois pieces tiennent ensemble, et retirer l'une suffit a rendre la page
     * au defaut mesure — 710 px a defiler au telephone avant d'apercevoir la
     * carte, 657 sur un 1440.
     *
     * 1. La carte est ecrite avant les reglages : c'est ce qui la met en tete au
     *    telephone, ou l'ordre du DOM fait la mise en page.
     * 2. Elle est collante, sinon elle sort du champ des qu'on descend vers les
     *    curseurs.
     * 3. Sur grand ecran les colonnes sont posees explicitement — sans cela, la
     *    carte, ecrite en premier, heritait de la colonne etroite des reglages.
     */
    const carte = readFileSync(new URL("../components/PrintableCard.tsx", import.meta.url), "utf8");
    const scene = carte.indexOf('className="print-scene"');
    const reglages = carte.indexOf('className="print-reglages"');
    assert.notEqual(scene, -1, "print-scene absent");
    assert.notEqual(reglages, -1, "print-reglages absent");
    assert.ok(scene < reglages, "la carte doit preceder les reglages dans le DOM");

    const bloc = (selecteur: string) => {
      const i = impression.indexOf(`\n${selecteur} {`);
      assert.notEqual(i, -1, `regle absente : ${selecteur}`);
      return impression.slice(i, impression.indexOf("\n}", i));
    };
    assert.match(bloc(".print-scene"), /position: sticky;/);
    assert.match(impression, /\.print-scene \{[^}]*grid-column: 2;/);
    assert.match(impression, /\.print-reglages \{[^}]*grid-column: 1;/);
  });

  test("une feuille reduite est rognee par son cadre", () => {
    /*
     * `transform: scale()` reduit ce qu'on voit, pas la boite mise en page : la
     * feuille mesure toujours 297 mm, soit 1 122 px. Sans rognage elle gonflait
     * la largeur du document et la page defilait lateralement sur telephone,
     * dans le vide — rien ne depassait a l'oeil, ce qui rend le defaut d'autant
     * plus facile a reintroduire.
     */
    for (const selecteur of [".feuille-cadre", ".carte-apercu__scene"]) {
      const i = impression.indexOf(`\n${selecteur} {`);
      assert.notEqual(i, -1, `regle absente : ${selecteur}`);
      const regle = impression.slice(i, impression.indexOf("\n}", i));
      assert.match(regle, /overflow: hidden;/, selecteur);
    }
  });

  test("la pastille de validation garde de quoi etre composee", () => {
    // Sans `z-index` explicite, le compositeur refuse de lui donner un calque et
    // rabat l'animation sur le fil principal : 11 peintures par clic au lieu de 7.
    const pastille = bloc(".card__check");
    assert.match(pastille, /z-index: 1;/);
    assert.doesNotMatch(pastille, /transition:/);
    assert.match(bloc('.card[aria-pressed="true"] .card__check'), /will-change: transform, opacity;/);
  });
}

// --- Rapport ---------------------------------------------------------------

function report() {
  if (failures.length > 0) {
    console.error(`\n${failures.length} échec(s) sur ${passed + failures.length} :\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`${passed} vérifications passées.`);
}

// `checkImages` est la seule partie asynchrone du harnais : on la chaine plutot
// que d'attendre au niveau du module, ce qui rendrait tout le script asynchrone.
checkImages().then(report, (err: unknown) => {
  failures.push(`vérifications d'image\n    ${(err as Error).message}`);
  report();
});
