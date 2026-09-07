/**
 * Vérifications de la logique pure : validation, slugs, extraction, expiration.
 * Aucune base de données requise.
 *
 *   npm run check
 */
import assert from "node:assert/strict";
import { canonicaliseUrl, cleanTitle, parseHtml } from "../lib/extract";
import { sslFor, toQuery } from "../lib/db";
// @ts-expect-error — module JavaScript simple, volontairement hors du bundle Next.
import { sslFor as bootSslFor } from "./boot.mjs";
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
import { DEFAULT_PALETTE_ID, paletteById, paletteIdOf } from "../lib/palettes";
import { RESERVED_SLUGS, slugError, slugify, suggestVariant } from "../lib/slug";
import { REPLY_WINDOW_MS, isExpired, isLocked, isSealed, replyWindowOpen } from "../lib/types";
import { LIMITS } from "../lib/limits";
import sharp from "sharp";
import { MAX_IMAGE_EDGE, shrinkImage } from "../lib/image";
import { ValidationError, validateCreate, validatePatch, validateTheme } from "../lib/validation";

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
  assert.equal(sslFor("postgres://u:p@localhost:5432/givly"), undefined);
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
    "postgres://u:p@localhost:5432/givly",
    "pas une url",
  ]) {
    assert.deepEqual(bootSslFor(url), sslFor(url), url);
  }
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
