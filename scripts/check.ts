/**
 * Vérifications de la logique pure : validation, slugs, extraction, expiration.
 * Aucune base de données requise.
 *
 *   npm run check
 */
import assert from "node:assert/strict";
import { canonicaliseUrl, cleanTitle, parseHtml } from "../lib/extract";
import {
  DEFAULT_OCCASION_ID,
  DEFAULT_OPENING_ID,
  OCCASIONS,
  OCCASION_GROUPS,
  OPENINGS,
  occasionById,
} from "../lib/occasions";
import { DEFAULT_PALETTE_ID, paletteById, paletteIdOf } from "../lib/palettes";
import { RESERVED_SLUGS, slugError, slugify, suggestVariant } from "../lib/slug";
import { isExpired, isLocked, isSealed } from "../lib/types";
import { LIMITS } from "../lib/limits";
import { ValidationError, validateCreate, validatePatch } from "../lib/validation";

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
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

test("validateCreate refuse un message vide", () => {
  throwsValidation(() => validateCreate({ ...validBody, thank_you_message: "   " }), "thank_you_message");
});

test("validateCreate refuse un label vide ou trop long", () => {
  throwsValidation(() => validateCreate({ ...validBody, items: [{ label: "" }, validItems[1]] }));
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

test("validateCreate exige un nom de carte", () => {
  const { name, ...sansNom } = validBody;
  void name;
  throwsValidation(() => validateCreate(sansNom), "name");
  throwsValidation(() => validateCreate({ ...validBody, name: "   " }), "name");
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

// --- Rapport ---------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n${failures.length} échec(s) sur ${passed + failures.length} :\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${passed} vérifications passées.`);
