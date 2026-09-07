"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GiftView, { type PreviewScreen } from "@/components/GiftView";
import {
  ACCEPTED_IMAGE_TYPES,
  imageFromClipboard,
  imageUrlFromClipboard,
  uploadImage,
} from "@/components/editor/imageFile";
import { LIMITS } from "@/lib/limits";
import {
  EFFECTS,
  FONTS,
  ITEMS_MESSAGE_HINT,
  ITEMS_TITLE_HINT,
  OCCASION_GROUPS,
  OPENINGS,
  effectById,
  fontById,
  occasionById,
  openingById,
  type EffectId,
  type FontId,
  type OccasionId,
  type OpeningId,
} from "@/lib/occasions";
import { PALETTES, paletteIdOf, type PaletteId } from "@/lib/palettes";
import {
  brouillonUtile,
  effacerBrouillon,
  ecrireBrouillon,
  lireBrouillon,
  type Brouillon,
} from "@/components/editor/draft";
import { slugError, slugify } from "@/lib/slug";
import type { Item, PublicPage, Theme } from "@/lib/types";

export type EditorInitial = {
  slug?: string;
  name: string;
  intro_message: string;
  signature: string;
  link_title: string;
  recipient_name: string;
  header_image_url: string | null;
  reveal_at: string | null;
  welcome_message: string;
  open_label: string;
  wait_message: string;
  items_title: string;
  items_message: string;
  thank_you_message: string;
  cover_image_url: string | null;
  theme: Theme;
  items: Item[];
};

export type CreateResult = {
  slug: string;
  publicUrl: string;
  adminUrl: string;
  expiresAt: string | null;
  warnings: { message: string }[];
};

type Props =
  | { mode: "create"; initial: EditorInitial; baseUrlLabel: string; onCreated: (r: CreateResult) => void }
  | { mode: "edit"; initial: EditorInitial; adminToken: string; slug: string };

type DraftItem = {
  key: string;
  id?: string;
  label: string;
  image_url: string;
  source_url: string;
  note: string;
  busy: "extract" | "upload" | null;
  hint: string | null;
};

/*
 * « La carte » n'a pas survecu comme etape : elle ne portait que le nom interne
 * et le prenom du receveur. Le nom vit desormais avec l'adresse du lien, le
 * prenom en tete du cadre « Intro » — la ou il s'affiche sur la carte.
 */
/** Pictogrammes du selecteur d'effet. Jamais affiches sur la page-cadeau. */
const EFFECT_GLYPHS: Record<EffectId, string> = {
  aucun: "◦",
  confettis: "✻",
  petales: "❀",
  etincelles: "✦",
  neige: "❄",
};

const STEPS = [
  { n: 1, title: "Les cadeaux", short: "Cadeaux" },
  { n: 2, title: "La présentation", short: "Présentation" },
] as const;

type StepNumber = 1 | 2;

let keySeed = 0;
const nextKey = () => `row_${++keySeed}`;

function toDraftItems(items: Item[]): DraftItem[] {
  const rows: DraftItem[] = items.map((it) => ({
    key: nextKey(),
    id: it.id,
    label: it.label,
    image_url: it.image_url ?? "",
    source_url: it.source_url ?? "",
    note: it.note ?? "",
    busy: null,
    hint: null,
  }));
  // Deux lignes vides a la creation : le cas courant reste le choix entre
  // plusieurs cadeaux. Le minimum reel est de un, mais partir d'une seule ligne
  // laissait croire que la carte n'accepte qu'un cadeau.
  //
  // En edition on ne complete rien : une carte volontairement mono-cadeau ne
  // doit pas voir apparaitre une ligne fantome.
  if (rows.length === 0) rows.push(emptyRow(), emptyRow());
  return rows;
}

function emptyRow(): DraftItem {
  return { key: nextKey(), label: "", image_url: "", source_url: "", note: "", busy: null, hint: null };
}

export default function PageEditor(props: Props) {
  const { mode, initial } = props;
  const router = useRouter();

  const [step, setStep] = useState<StepNumber>(1);
  // En édition, tout est déjà rempli : on autorise à sauter d'une étape à l'autre.
  const [furthest, setFurthest] = useState<StepNumber>(mode === "edit" ? 2 : 1);

  const [name, setName] = useState(initial.name);
  const [intro, setIntro] = useState(initial.intro_message);
  const [signature, setSignature] = useState(initial.signature);
  const [recipient, setRecipient] = useState(initial.recipient_name);
  const [header, setHeader] = useState(initial.header_image_url ?? "");
  // <input type="datetime-local"> attend "AAAA-MM-JJThh:mm" en heure locale.
  const [revealAt, setRevealAt] = useState(toLocalInput(initial.reveal_at));
  const [welcome, setWelcome] = useState(initial.welcome_message);
  const [openLabel, setOpenLabel] = useState(initial.open_label);
  const [waitMessage, setWaitMessage] = useState(initial.wait_message);
  const [itemsTitle, setItemsTitle] = useState(initial.items_title);
  const [itemsMessage, setItemsMessage] = useState(initial.items_message);
  const [thanks, setThanks] = useState(initial.thank_you_message);
  const [cover, setCover] = useState(initial.cover_image_url ?? "");
  const [layout, setLayout] = useState<Theme["layout"]>(initial.theme.layout ?? "grid");
  const [palette, setPalette] = useState<PaletteId>(paletteIdOf(initial.theme.palette));
  const [occasion, setOccasion] = useState<OccasionId>(occasionById(initial.theme.occasion).id);
  const [font, setFont] = useState<FontId>(fontById(initial.theme.font).id);
  const [motif, setMotif] = useState(initial.theme.motif !== false);
  const [opening, setOpeningStyle] = useState<OpeningId>(openingById(initial.theme.opening).id);
  const [effect, setEffect] = useState<EffectId>(effectById(initial.theme.effect).id);
  const [replyOn, setReplyOn] = useState(initial.theme.reply === true);
  const [linkTitle, setLinkTitle] = useState(initial.link_title);
  const [sealEnabled, setSealEnabled] = useState(initial.theme.cover !== false);
  // Remonte GiftView pour rejouer l'ouverture sans recharger la page.
  const [replay, setReplay] = useState(0);
  /*
   * Quel ecran l'apercu doit montrer. Regler le titre de l'ecran des cadeaux
   * pendant que l'apercu affiche encore le voile revenait a travailler a
   * l'aveugle : l'apercu suit donc le cadre qu'on est en train de modifier.
   */
  const [ecranApercu, setEcranApercu] = useState<PreviewScreen>("intro");
  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(initial.items));

  // Un repli est ouvert d'emblee si le champ porte deja une valeur : en edition,
  // rien de ce qui a ete rempli ne doit se cacher.
  //
  // Le mot d'ouverture et la signature n'en sont plus : ce sont des champs de
  // texte comme les autres, ranges dans le cadre de l'ecran ou ils s'affichent.
  // Une case a cocher devant un champ facultatif ne protegeait de rien et
  // ajoutait un geste.
  const [headerOn, setHeaderOn] = useState(Boolean(initial.header_image_url));
  const [linkOn, setLinkOn] = useState(
    Boolean(initial.link_title) || Boolean(initial.cover_image_url),
  );
  const [revealOn, setRevealOn] = useState(Boolean(initial.reveal_at));

  /*
   * Un brouillon a-t-il ete retrouve ? Sert uniquement a l'annoncer : la
   * restauration elle-meme est silencieuse, on ne demande pas au donneur s'il
   * veut recuperer son travail — la reponse est evidemment oui. Le bandeau
   * existe pour l'autre cas, celui ou il voulait justement repartir de zero.
   */
  const [brouillonRetrouve, setBrouillonRetrouve] = useState(false);
  const restaure = useRef(false);

  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /*
   * L'instantane du travail en cours, reconstruit a chaque rendu — quelques
   * champs, le cout est nul — pour que la sauvegarde et le vidage au masquage
   * lisent toujours l'etat le plus recent.
   */
  const instantane: Brouillon = {
    version: 1,
    a: 0,
    etape: step,
    name,
    intro,
    signature,
    recipient,
    header,
    revealAt,
    welcome,
    openLabel,
    waitMessage,
    itemsTitle,
    itemsMessage,
    thanks,
    cover,
    layout: layout === "list" ? "list" : "grid",
    palette,
    occasion,
    font,
    opening,
    effect,
    linkTitle,
    motif,
    replyOn,
    sealEnabled,
    headerOn,
    linkOn,
    revealOn,
    items: items.map((i) => ({
      label: i.label,
      image_url: i.image_url,
      source_url: i.source_url,
      note: i.note,
    })),
  };

  const dernier = useRef(instantane);
  dernier.current = instantane;
  // Sert de cle de dependance : l'objet est neuf a chaque rendu, sa forme
  // serialisee ne change que quand quelque chose a reellement bouge.
  const empreinte = JSON.stringify(instantane);

  /*
   * Restauration, une fois, au montage.
   *
   * Pas dans l'initialisation des `useState` : `localStorage` n'existe pas au
   * rendu serveur, et lire le brouillon la ferait diverger l'hydratation. On
   * accepte donc une image du formulaire vide, le temps d'une frame.
   *
   * Silencieuse : on ne demande pas au donneur s'il veut retrouver son travail,
   * la reponse est oui. Le bandeau qui suit sert au cas inverse.
   */
  useEffect(() => {
    if (mode !== "create" || restaure.current) return;
    restaure.current = true;

    const b = lireBrouillon();
    if (!b || !brouillonUtile(b)) return;

    setStep(b.etape === 2 ? 2 : 1);
    setFurthest(b.etape === 2 ? 2 : 1);
    setName(b.name);
    setIntro(b.intro);
    setSignature(b.signature);
    setRecipient(b.recipient);
    setHeader(b.header);
    setRevealAt(b.revealAt);
    setWelcome(b.welcome);
    setOpenLabel(b.openLabel);
    setWaitMessage(b.waitMessage);
    setItemsTitle(b.itemsTitle);
    setItemsMessage(b.itemsMessage);
    setThanks(b.thanks);
    setCover(b.cover);
    setLayout(b.layout === "list" ? "list" : "grid");
    // Les identifiants passent par les normalisateurs : un theme retire depuis
    // l'enregistrement retombe seul sur la valeur par defaut.
    setPalette(paletteIdOf({ id: b.palette }));
    setOccasion(occasionById(b.occasion).id);
    setFont(fontById(b.font).id);
    setOpeningStyle(openingById(b.opening).id);
    setEffect(effectById(b.effect).id);
    setLinkTitle(b.linkTitle);
    setMotif(b.motif);
    setReplyOn(b.replyOn);
    setSealEnabled(b.sealEnabled);
    setHeaderOn(b.headerOn);
    setLinkOn(b.linkOn);
    setRevealOn(b.revealOn);
    if (b.items.length > 0) {
      setItems(b.items.map((i) => ({ key: nextKey(), ...i, busy: null, hint: null })));
    }
    setBrouillonRetrouve(true);
  }, [mode]);

  /* Enregistrement courant, temporise : une frappe ne doit pas ecrire a chaque touche. */
  useEffect(() => {
    if (mode !== "create" || !restaure.current) return;
    if (!brouillonUtile(dernier.current)) {
      effacerBrouillon();
      return;
    }
    const id = setTimeout(() => ecrireBrouillon(dernier.current), 500);
    return () => clearTimeout(id);
  }, [mode, empreinte]);

  /*
   * Le filet qui compte au telephone.
   *
   * C'est en partant chez le marchand que le travail se perd, et un onglet passe
   * en arriere-plan peut etre supprime sans preavis. `beforeunload` n'est pas
   * fiable sur mobile ; `pagehide` et le passage a `hidden`, si. On ecrit alors
   * sans attendre la temporisation.
   */
  useEffect(() => {
    if (mode !== "create") return;

    const enregistrer = () => {
      if (brouillonUtile(dernier.current)) ecrireBrouillon(dernier.current);
    };
    const surVisibilite = () => {
      if (document.visibilityState === "hidden") enregistrer();
    };

    window.addEventListener("pagehide", enregistrer);
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      window.removeEventListener("pagehide", enregistrer);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [mode]);

  /** Vide le formulaire et le brouillon : pour qui voulait justement recommencer. */
  function repartirDeZero() {
    effacerBrouillon();
    setBrouillonRetrouve(false);
    setStep(1);
    setFurthest(1);
    setName("");
    setIntro("");
    setSignature("");
    setRecipient("");
    setHeader("");
    setRevealAt("");
    setWelcome("");
    setOpenLabel("");
    setWaitMessage("");
    setItemsTitle("");
    setItemsMessage("");
    setThanks("");
    setCover("");
    setLayout("grid");
    setPalette(paletteIdOf(undefined));
    setOccasion(occasionById(undefined).id);
    setFont(fontById(undefined).id);
    setOpeningStyle(openingById(undefined).id);
    setEffect(effectById(undefined).id);
    setLinkTitle("");
    setMotif(true);
    setReplyOn(false);
    setSealEnabled(true);
    setHeaderOn(false);
    setLinkOn(false);
    setRevealOn(false);
    setItems(toDraftItems([]));
    setError(null);
    toTop();
  }

  useEffect(() => {
    if (!preview) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [preview]);

  const current = occasionById(occasion);

  /**
   * Plus rien n'est obligatoire : un champ laissé vide retombe sur la suggestion
   * que le donneur avait sous les yeux en placeholder. Le nom, lui, n'a pas de
   * placeholder utilisable tel quel — « Anniversaire de Sophie » deviendrait
   * l'adresse de toutes les cartes anonymes — alors on le compose à partir de
   * l'occasion et du prénom déjà saisis.
   */
  const effectiveName =
    name.trim() ||
    (() => {
      const base = current.id === "aucune" ? "Carte cadeau" : current.name;
      const who = recipient.trim();
      return who ? `${base} — ${who}` : base;
    })();

  // Le nom de la carte alimente l'adresse du lien tant que le donneur n'y a pas touché.
  const autoSlug = useMemo(() => slugify(effectiveName) || "cadeau", [effectiveName]);
  // L'adresse decoule du nom, sans reglage : le donneur ne s'en soucie pas, et
  // le serveur resout tout seul une eventuelle collision.
  const effectiveSlug = mode === "create" ? autoSlug : (initial.slug ?? "");

  function toTop() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goTo(target: StepNumber) {
    setError(null);
    setStep(target);
    if (target > furthest) setFurthest(target);
    toTop();
  }

  /**
   * Le message d'erreur vit en haut du formulaire, sous les puces d'étape : le
   * bouton d'enregistrement est en bas d'une page longue, et une bulle affichée
   * juste à côté de lui restait hors de l'écran une fois la page remontée.
   */
  function showError(message: string) {
    setError(message);
    toTop();
  }

  function next() {
    const invalid = validateStep(step);
    if (invalid) {
      showError(invalid);
      return;
    }
    goTo(Math.min(2, step + 1) as StepNumber);
  }

  function patchItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function move(key: string, direction: -1 | 1) {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.key === key);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function extract(key: string) {
    const row = items.find((it) => it.key === key);
    if (!row) return;
    const url = row.source_url.trim();
    if (!url) {
      patchItem(key, { hint: "Colle d'abord l'adresse de la page du produit." });
      return;
    }

    patchItem(key, { busy: "extract", hint: null });
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        title?: string;
        image?: string;
        reason?: string;
      };

      const patch: Partial<DraftItem> = { busy: null };
      const gotTitle = Boolean(data.title) && !row.label.trim();
      if (gotTitle) patch.label = data.title!.slice(0, LIMITS.itemLabel);

      if (data.ok && data.image) {
        patch.image_url = data.image;
        patch.hint = gotTitle
          ? "Titre et image récupérés. Tu peux les remplacer."
          : "Image récupérée. Tu peux la remplacer si elle ne te plaît pas.";
      } else {
        // Repli manuel : chemin nominal, pas une erreur.
        patch.hint = `${failureHint(data.reason)}${gotTitle ? " Le titre, lui, a été récupéré." : ""}`;
      }
      patchItem(key, patch);
    } catch {
      patchItem(key, {
        busy: null,
        hint: "Récupération impossible. Colle une adresse d'image ou téléverse une photo.",
      });
    }
  }

  /**
   * Coller une image evite d'ouvrir un selecteur de fichier : capture d'ecran,
   * « copier l'image » depuis une page marchande, ou fichier copie dans
   * l'explorateur. L'image part au meme endroit que le televersement — il faut
   * bien une URL en base, on ne stocke pas de data: URI.
   */
  function handlePaste(key: string, event: React.ClipboardEvent) {
    const row = items.find((it) => it.key === key);
    if (!row || row.busy) return;

    const file = imageFromClipboard(event.clipboardData);
    if (file) {
      event.preventDefault();
      void upload(key, file);
      return;
    }

    // Le texte colle dans un champ de saisie lui appartient : on n'y touche pas.
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    const url = imageUrlFromClipboard(event.clipboardData);
    if (url) {
      event.preventDefault();
      patchItem(key, { image_url: url, hint: "Adresse d'image collee." });
    }
  }

  async function upload(key: string, file: File | null) {
    if (!file) return;
    patchItem(key, { busy: "upload", hint: null });
    const result = await uploadImage(file);
    if (result.ok) {
      patchItem(key, { busy: null, image_url: result.url, hint: null });
    } else {
      patchItem(key, { busy: null, hint: result.error });
    }
  }

  const draftItems: Item[] = items
    .filter(
      (it) => it.label.trim() !== "" || it.image_url.trim() !== "" || it.source_url.trim() !== "",
    )
    .map((it, index) => ({
      id: it.id ?? `draft_${index}`,
      label: it.label.trim() || "Sans titre",
      image_url: it.image_url.trim() || null,
      source_url: it.source_url.trim() || null,
      note: it.note.trim() || null,
    }));

  const theme: Theme = {
    layout,
    palette: { id: palette },
    occasion,
    font,
    motif: current.motif !== "none" && motif,
    cover: sealEnabled,
    opening,
    effect,
    reply: replyOn,
  };

  /**
   * Une occasion est un preset : elle repose palette et decor d'un coup. Le
   * message d'ouverture n'est efface que s'il valait encore celui de l'occasion
   * precedente — jamais si le donneur a ecrit le sien.
   */
  function chooseOccasion(id: OccasionId) {
    const previous = occasionById(occasion);
    const next = occasionById(id);
    setOccasion(id);
    setPalette(next.palette);
    setMotif(next.motif !== "none");
    // L'effet suit l'occasion tant que le donneur n'en a pas choisi un autre.
    setEffect((cur) => (cur === previous.effect ? next.effect : cur));
    setIntro((cur) => (cur.trim() === previous.intro ? "" : cur));
  }

  const previewPage: PublicPage = {
    slug: effectiveSlug || "apercu",
    intro_message: intro,
    signature,
    reply_message: "",
    recipient_name: recipient,
    header_image_url: header.trim() || null,
    reveal_at: revealAt ? new Date(revealAt).toISOString() : null,
    // Champ vide : on montre la suggestion de l'occasion, pas un texte fige.
    // L'apercu doit refleter le theme choisi, comme les placeholders du formulaire.
    welcome_message: welcome.trim() || current.welcomeHint,
    open_label: openLabel,
    wait_message: waitMessage,
    items_title: itemsTitle,
    items_message: itemsMessage,
    thank_you_message: thanks.trim() || current.thanksHint,
    theme,
    items: draftItems,
    chosen_item_id: null,
    chosen_at: null,
  };

  /**
   * Chaque étape ne juge que ses propres champs, pour ne pas bloquer sur la
   * suivante. Aucun champ de texte n'est obligatoire : un champ vide prend la
   * valeur de son placeholder au moment de l'enregistrement. Il ne reste donc
   * que ce qui est structurel — il faut bien au moins un cadeau à choisir.
   */
  function validateStep(which: StepNumber): string | null {
    if (which === 1) {
      const filled = filledItems();
      if (filled.length < LIMITS.itemsMin) return "Il faut au moins un cadeau.";
      if (filled.length > LIMITS.itemsMax) return `Pas plus de ${LIMITS.itemsMax} cadeaux.`;
      return null;
    }

    if (name.trim().length > LIMITS.name) return `Le nom dépasse ${LIMITS.name} caractères.`;
    if (mode === "create") {
      const err = slugError(effectiveSlug);
      if (err) return err;
    }
    if (welcome.trim().length > LIMITS.message) {
      return `Le message principal dépasse ${LIMITS.message} caractères.`;
    }
    if (thanks.trim().length > LIMITS.message) {
      return `Le message de fin dépasse ${LIMITS.message} caractères.`;
    }
    return null;
  }

  /**
   * Une ligne compte dès qu'elle porte quelque chose : titre, image ou adresse.
   * Sans ça, une ligne remplie uniquement par la récupération d'image se serait
   * évaporée en silence à l'enregistrement.
   */
  function filledItems() {
    return items.filter(
      (it) => it.label.trim() !== "" || it.image_url.trim() !== "" || it.source_url.trim() !== "",
    );
  }

  function payload() {
    return {
      name: effectiveName,
      intro_message: intro.trim(),
      signature: signature.trim(),
      recipient_name: recipient.trim(),
      link_title: linkTitle.trim(),
      header_image_url: header.trim() || null,
      reveal_at: revealAt ? new Date(revealAt).toISOString() : null,
      // Champ vide : on enregistre la suggestion affichée en placeholder, celle
      // que le donneur avait sous les yeux et a implicitement acceptée.
      welcome_message: welcome.trim() || current.welcomeHint,
      open_label: openLabel.trim() || current.openHint,
      wait_message: waitMessage.trim() || current.waitHint,
      items_title: itemsTitle.trim() || ITEMS_TITLE_HINT,
      items_message: itemsMessage.trim() || ITEMS_MESSAGE_HINT,
      thank_you_message: thanks.trim() || current.thanksHint,
      cover_image_url: cover.trim() || null,
      theme,
      items: filledItems().map((it) => ({
        ...(it.id ? { id: it.id } : {}),
        label: it.label.trim() || "Sans titre",
        image_url: it.image_url.trim() || null,
        source_url: it.source_url.trim() || null,
        note: it.note.trim() || null,
      })),
    };
  }

  async function submit() {
    setError(null);
    setWarnings([]);
    setSavedAt(null);

    // Une erreur sur une étape en amont doit ramener le donneur sur cette étape,
    // sinon le message parle d'un champ qu'il n'a pas sous les yeux.
    for (const which of [1, 2] as StepNumber[]) {
      const invalid = validateStep(which);
      if (invalid) {
        goTo(which);
        setError(invalid);
        return;
      }
    }

    setSaving(true);
    try {
      const res =
        props.mode === "create"
          ? await fetch("/api/pages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: effectiveSlug, ...payload() }),
            })
          : await fetch(`/api/admin/${encodeURIComponent(props.adminToken)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload()),
            });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        if ((data.field as string) === "slug") goTo(2);
        showError((data.error as string) ?? "L'enregistrement a échoué.");
        return;
      }

      const w = Array.isArray(data.warnings)
        ? (data.warnings as { message: string }[]).map((x) => x.message)
        : [];
      setWarnings(w);

      if (props.mode === "create") {
        // La page existe : le brouillon n'a plus de raison d'etre, et le laisser
        // ferait resurgir la carte precedente a la composition suivante.
        effacerBrouillon();
        props.onCreated(data as unknown as CreateResult);
      } else {
        // Le serveur a pu réécrire les items : ids attribués aux nouvelles lignes,
        // image_url pointant désormais vers Blob. Sans cette resynchronisation, une
        // seconde sauvegarde recopierait les mêmes images et réattribuerait des ids.
        const saved = (data.page ?? {}) as {
          items?: Item[];
          cover_image_url?: string | null;
          header_image_url?: string | null;
        };
        if (saved.items) setItems(toDraftItems(saved.items));
        if ("cover_image_url" in saved) setCover(saved.cover_image_url ?? "");
        if ("header_image_url" in saved) setHeader(saved.header_image_url ?? "");
        setSavedAt(new Date().toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" }));
        router.refresh();
      }
    } catch {
      showError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setSaving(false);
    }
  }

  if (preview) {
    // Superposition plein écran : sinon l'aperçu s'afficherait à l'intérieur de
    // la page de création (hero compris) et ne montrerait pas ce que le receveur
    // voit réellement.
    return (
      <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Aperçu de la page-cadeau">
        <div className="preview-ribbon">
          Aperçu — rien n&apos;est enregistré
          <button type="button" className="preview-ribbon__exit" onClick={() => setPreview(false)}>
            Fermer
          </button>
        </div>
        <GiftView
          page={previewPage}
          mode="preview"
          previewScreen={ecranApercu}
          onExitPreview={() => setPreview(false)}
        />
      </div>
    );
  }

  const isLast = step === 2;
  const filledCount = filledItems().length;

  return (
    <div className="editor">
      <ol className="stepper">
        {STEPS.map((s) => {
          const state = s.n === step ? "is-current" : s.n < step ? "is-done" : "";
          const reachable = s.n <= furthest;
          return (
            <li key={s.n} className={`stepper__item ${state}`}>
              <button
                type="button"
                className="stepper__btn"
                disabled={!reachable}
                aria-current={s.n === step ? "step" : undefined}
                onClick={() => reachable && goTo(s.n as StepNumber)}
              >
                <span className="stepper__num">{s.n < step ? "✓" : s.n}</span>
                <span className="stepper__label">{s.short}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Les messages restent en tête du formulaire : c'est là que la page revient
          quand quelque chose bloque, et une bulle en bas serait hors de l'écran. */}
      {error && (
        <p className="notice notice--error editor__notice" role="alert">
          {error}
        </p>
      )}
      {warnings.map((w) => (
        <p className="notice notice--warn editor__notice" key={w}>
          {w}
        </p>
      ))}
      {savedAt && (
        <p className="notice notice--info editor__notice">Modifications enregistrées à {savedAt}.</p>
      )}
      {brouillonRetrouve && (
        <p className="notice notice--info editor__notice">
          Ta carte en cours a été retrouvée telle que tu l&apos;avais laissée.{" "}
          <button type="button" className="notice__action" onClick={repartirDeZero}>
            Repartir de zéro
          </button>
        </p>
      )}

      {step === 1 && (
        <section className="panel">
          <div className="panel__head">
            <h2>Les cadeaux</h2>
            <span className="panel__count">
              {filledCount} / {LIMITS.itemsMax}
            </span>
          </div>
          <p className="help">
            Jusqu&apos;à {LIMITS.itemsMax} propositions. Colle l&apos;adresse d&apos;un produit pour
            récupérer le titre et l&apos;image, ou remplis tout à la main.
            {filledCount === 1 && (
              <>
                {" "}
                <strong>Avec un seul cadeau</strong>, la carte devient une annonce : rien à choisir,
                juste un accusé de réception.
              </>
            )}
          </p>

          <ol className="rows">
            {items.map((row, index) => (
              <li className="row" key={row.key} onPaste={(e) => handlePaste(row.key, e)}>
                <div className="row__head">
                  <span className="row__index">{index + 1}</span>
                  <div className="row__tools">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Monter le cadeau ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => move(row.key, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Descendre le cadeau ${index + 1}`}
                      disabled={index === items.length - 1}
                      onClick={() => move(row.key, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label={`Retirer le cadeau ${index + 1}`}
                      disabled={items.length <= 1}
                      onClick={() => setItems((prev) => prev.filter((it) => it.key !== row.key))}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/*
                  L'adresse du produit est sortie de `row__fields` pour devenir une
                  case a part entiere de la grille : c'est le seul moyen de la faire
                  passer au-dessus de la vignette au telephone, ou tout s'empile,
                  tout en la gardant a droite de la vignette au large. L'ordre est
                  porte par `grid-template-areas`, pas par l'ordre du DOM — qui
                  reste celui de la lecture : on colle un lien, puis on regarde ce
                  qui en est sorti.
                */}
                <div className="row__grid">
                  <div className="row__source">
                    <Field label="Adresse de la page produit" help="Facultatif. Jamais affichée sur la page-cadeau.">
                      <div className="inline">
                        <input
                          type="url"
                          inputMode="url"
                          value={row.source_url}
                          aria-label={`Adresse de la page produit du cadeau ${index + 1}`}
                          placeholder="https://…"
                          onChange={(e) => patchItem(row.key, { source_url: e.target.value })}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={row.busy !== null}
                          onClick={() => extract(row.key)}
                        >
                          {row.busy === "extract" ? "…" : "Récupérer"}
                        </button>
                      </div>
                    </Field>
                  </div>

                  <div
                    className={`row__preview${row.image_url ? "" : " row__preview--empty"}${
                      row.busy === "upload" ? " is-busy" : ""
                    }`}
                    tabIndex={0}
                    role="button"
                    aria-label={`Coller une image pour le cadeau ${index + 1}`}
                    onPaste={(e) => handlePaste(row.key, e)}
                  >
                    {row.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.image_url} alt="" />
                    ) : (
                      <span>
                        {row.busy === "upload" ? "envoi…" : "colle une image ici"}
                      </span>
                    )}
                  </div>

                  <div className="row__fields">
                    <Field label="Titre">
                      <input
                        type="text"
                        value={row.label}
                        aria-label={`Titre du cadeau ${index + 1}`}
                        maxLength={LIMITS.itemLabel}
                        placeholder="Collier Fluorite"
                        onChange={(e) => patchItem(row.key, { label: e.target.value })}
                      />
                    </Field>

                    <Field
                      label="Image"
                      help="Colle une image (Ctrl+V) n'importe où sur cette ligne, colle une adresse, ou choisis un fichier."
                    >
                      <div className="inline">
                        <input
                          type="url"
                          inputMode="url"
                          value={row.image_url}
                          aria-label={`Adresse de l'image du cadeau ${index + 1}`}
                          placeholder="https://…/photo.jpg"
                          onChange={(e) => patchItem(row.key, { image_url: e.target.value })}
                        />
                        <label className={`btn btn--ghost btn--sm${row.busy ? " is-disabled" : ""}`}>
                          {row.busy === "upload" ? "…" : "Téléverser"}
                          <input
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(",")}
                            hidden
                            disabled={row.busy !== null}
                            onChange={(e) => {
                              void upload(row.key, e.target.files?.[0] ?? null);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </Field>

                    <Field label="Note" help="Facultatif. Un mot pour situer le cadeau.">
                      <input
                        type="text"
                        value={row.note}
                        aria-label={`Note du cadeau ${index + 1}`}
                        maxLength={LIMITS.itemNote}
                        placeholder="Un soir de semaine, sans se presser"
                        onChange={(e) => patchItem(row.key, { note: e.target.value })}
                      />
                    </Field>

                    {row.hint && <p className="notice notice--info">{row.hint}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={items.length >= LIMITS.itemsMax}
            onClick={() => setItems((prev) => [...prev, emptyRow()])}
          >
            + Ajouter un cadeau
          </button>
        </section>
      )}

      {step === 2 && (
        <div className="compose">
          {/* Aperçu vivant : le même composant que la page réelle, en réduction.
              Il réagit à chaque réglage, sans passer par le plein écran. */}
          <aside className="compose__side">
            <div className="mini">
              <div className="mini__head">
                <span>Aperçu en direct</span>
                <div className="mini__actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setReplay((n) => n + 1)}
                  >
                    Rejouer
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreview(true)}>
                    Plein écran
                  </button>
                </div>
              </div>
              <div className="mini__frame">
                <div className="mini__scale">
                  <GiftView
                    key={replay}
                    page={previewPage}
                    mode="preview"
                    variant="embedded"
                    previewScreen={ecranApercu}
                  />
                </div>
              </div>
            </div>
          </aside>

          <div className="compose__main">
            <section className="panel">
              <h2>L&apos;occasion</h2>
              <p className="help">
                Elle pose d&apos;un coup une palette, un décor et des formulations de départ. Tout
                reste modifiable juste en dessous.
              </p>
              <div className="occasion-groups" role="radiogroup" aria-label="Occasion">
                {OCCASION_GROUPS.map((groupe) => (
                  <div key={groupe.label ?? "base"}>
                    {groupe.label && <p className="occasion-group__title">{groupe.label}</p>}
                    <div className="occasions">
                      {groupe.items.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={occasion === o.id}
                          className={`occasion${occasion === o.id ? " is-on" : ""}`}
                          onClick={() => chooseOccasion(o.id)}
                        >
                          <span className="occasion__icon" aria-hidden="true">
                            {o.icon}
                          </span>
                          <span className="occasion__name">{o.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Les trois cadres suivants suivent l'ordre des écrans que traverse la
                personne qui reçoit : ce qu'elle voit en arrivant, les cadeaux, puis
                l'écran qui suit son choix. */}
            <section
              className="panel"
              onFocusCapture={() => setEcranApercu("intro")}
              onClickCapture={() => setEcranApercu("intro")}
            >
              <h2>Intro</h2>
              <p className="help">
                Le premier écran : ce qui s&apos;affiche avant les cadeaux.
              </p>

              <Field
                label="Prénom de la personne"
                help="Facultatif. Affiché tout en haut."
              >
                <input
                  type="text"
                  value={recipient}
                  aria-label="Prénom de la personne"
                  maxLength={LIMITS.recipient}
                  placeholder="Sophie"
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <Counter value={recipient} max={LIMITS.recipient} />
              </Field>

              <Field label="Mot d&apos;ouverture" help="La petite ligne au-dessus du titre.">
                <input
                  type="text"
                  value={intro}
                  aria-label="Mot d'ouverture"
                  maxLength={LIMITS.intro}
                  placeholder={current.intro}
                  onChange={(e) => setIntro(e.target.value)}
                />
                <Counter value={intro} max={LIMITS.intro} />
              </Field>

              <Field
                label="Message principal"
                help="Le grand titre. Sert aussi à l&apos;aperçu du lien."
              >
                <textarea
                  value={welcome}
                  aria-label="Message principal"
                  maxLength={LIMITS.message}
                  rows={2}
                  onChange={(e) => setWelcome(e.target.value)}
                  placeholder={current.welcomeHint}
                />
                <Counter value={welcome} max={LIMITS.message} />
              </Field>

              <Field
                label="Texte du bouton"
                help={
                  sealEnabled
                    ? "Le bouton qui lève le voile et découvre les cadeaux."
                    : "Sans voile d'ouverture, ce bouton ne s'affiche pas."
                }
              >
                <input
                  type="text"
                  value={openLabel}
                  aria-label="Texte du bouton d'ouverture"
                  maxLength={LIMITS.openLabel}
                  placeholder={current.openHint}
                  onChange={(e) => setOpenLabel(e.target.value)}
                />
                <Counter value={openLabel} max={LIMITS.openLabel} />
              </Field>

              <div className="options">
                <Optional
                  label="Ouvrir la carte d&apos;un geste"
                  help="Un voile opaque porte ces mots ; les cadeaux apparaissent après."
                  checked={sealEnabled}
                  onChange={setSealEnabled}
                >
                  <Field label="Manière de l&apos;ouvrir">
                    <div className="openings" role="radiogroup" aria-label="Manière de l'ouvrir">
                      {OPENINGS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="radio"
                          aria-checked={opening === o.id}
                          className={`opening${opening === o.id ? " is-on" : ""}`}
                          onClick={() => setOpeningStyle(o.id)}
                        >
                          <span className={`opening__glyph opening__glyph--${o.id}`} aria-hidden="true">
                            <i />
                            <i />
                          </span>
                          <span className="opening__name">{o.name}</span>
                          <span className="opening__hint">{o.hint}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                </Optional>

                <Optional
                  label="Ouvrir à une date précise"
                  help="Avant elle, la carte reste scellée sur un compte à rebours — tu peux donc envoyer le lien à l'avance."
                  checked={revealOn}
                  onChange={(on) => {
                    setRevealOn(on);
                    if (!on) setRevealAt("");
                  }}
                >
                  <Field label="Date de révélation">
                    <input
                      type="datetime-local"
                      value={revealAt}
                      aria-label="Date de révélation"
                      onChange={(e) => setRevealAt(e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Mot d&apos;attente"
                    help="Sous le compte à rebours, pendant que la carte est encore scellée."
                  >
                    <input
                      type="text"
                      value={waitMessage}
                      aria-label="Mot d'attente"
                      maxLength={LIMITS.waitMessage}
                      placeholder={current.waitHint}
                      onChange={(e) => setWaitMessage(e.target.value)}
                    />
                    <Counter value={waitMessage} max={LIMITS.waitMessage} />
                  </Field>
                </Optional>

              </div>
            </section>

            <section
              className="panel"
              onFocusCapture={() => setEcranApercu("cadeaux")}
              onClickCapture={() => setEcranApercu("cadeaux")}
            >
              <h2>Cadeaux</h2>
              <p className="help">
                L&apos;écran qui suit l&apos;ouverture. Ses mots lui appartiennent : répéter ceux du
                voile ferait lire deux fois la même chose.
              </p>

              <Field label="Titre" help="Au-dessus des cadeaux.">
                <input
                  type="text"
                  value={itemsTitle}
                  aria-label="Titre de l'écran des cadeaux"
                  maxLength={LIMITS.itemsTitle}
                  placeholder={ITEMS_TITLE_HINT}
                  onChange={(e) => setItemsTitle(e.target.value)}
                />
                <Counter value={itemsTitle} max={LIMITS.itemsTitle} />
              </Field>

              <Field label="Contenu" help="La ligne sous ce titre.">
                <textarea
                  value={itemsMessage}
                  aria-label="Contenu de l'écran des cadeaux"
                  maxLength={LIMITS.itemsMessage}
                  rows={2}
                  placeholder={ITEMS_MESSAGE_HINT}
                  onChange={(e) => setItemsMessage(e.target.value)}
                />
                <Counter value={itemsMessage} max={LIMITS.itemsMessage} />
              </Field>

              <Field label="Signature" help="Facultatif. En bas de page, pour dire de qui ça vient.">
                <input
                  type="text"
                  value={signature}
                  aria-label="Signature"
                  maxLength={LIMITS.signature}
                  placeholder="Avec toute mon affection, Nathan"
                  onChange={(e) => setSignature(e.target.value)}
                />
                <Counter value={signature} max={LIMITS.signature} />
              </Field>

              <div className="options">
                <Optional
                  label="Ajouter une photo d&apos;en-tête"
                  help="Une photo large en haut de cet écran, au-dessus du titre."
                  checked={headerOn}
                  onChange={(on) => {
                    setHeaderOn(on);
                    if (!on) setHeader("");
                  }}
                >
                  <ImageField
                    label="Photo d'en-tête"
                    ariaLabel="Photo d'en-tête"
                    value={header}
                    onChange={setHeader}
                  />
                </Optional>
              </div>
            </section>

            <section
              className="panel"
              onFocusCapture={() => setEcranApercu("choix")}
              onClickCapture={() => setEcranApercu("choix")}
            >
              <h2>Choix</h2>
              <p className="help">Le dernier écran, une fois le cadeau confirmé.</p>

              <Field label="Message de fin" help="Ce qui s&apos;affiche à la place des cadeaux.">
                <textarea
                  value={thanks}
                  aria-label="Message de fin"
                  maxLength={LIMITS.message}
                  rows={2}
                  onChange={(e) => setThanks(e.target.value)}
                  placeholder={current.thanksHint}
                />
                <Counter value={thanks} max={LIMITS.message} />
              </Field>

              <div className="options">
                <Optional
                  label="Proposer de laisser un mot"
                  help="Laisse l&apos;opportunité à la personne de te répondre directement après avoir fait son choix."
                  checked={replyOn}
                  onChange={setReplyOn}
                >
                  <p className="help" style={{ marginBottom: 0 }}>
                    Le mot apparaîtra dans ta vue d&apos;administration.
                  </p>
                </Optional>
              </div>
            </section>

            <section className="panel">
              <h2>Le thème</h2>

              <Field label="Palette">
                <div className="palettes" role="radiogroup" aria-label="Palette">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={palette === p.id}
                      className={`palette${palette === p.id ? " is-on" : ""}`}
                      onClick={() => setPalette(p.id)}
                    >
                      <span className="palette__chips" aria-hidden="true">
                        {p.swatch.map((c) => (
                          <span key={c} style={{ background: c }} />
                        ))}
                      </span>
                      <span className="palette__name">{p.name}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Police du titre">
                <div className="fonts" role="radiogroup" aria-label="Police du titre">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={font === f.id}
                      className={`font-choice${font === f.id ? " is-on" : ""}`}
                      onClick={() => setFont(f.id)}
                    >
                      <span className="font-choice__sample" style={{ fontFamily: f.cssVar }}>
                        {f.sample}
                      </span>
                      <span className="font-choice__name">{f.name}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Disposition">
                <div className="segmented" role="radiogroup" aria-label="Disposition">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={layout === "grid"}
                    className={layout === "grid" ? "is-on" : ""}
                    onClick={() => setLayout("grid")}
                  >
                    Grille
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={layout === "list"}
                    className={layout === "list" ? "is-on" : ""}
                    onClick={() => setLayout("list")}
                  >
                    Liste
                  </button>
                </div>
              </Field>

              <Field
                label="Effet"
                help="Ce qui tombe sur la page une fois découverte. Une seule fois, pas en boucle."
              >
                <div className="effects" role="radiogroup" aria-label="Effet">
                  {EFFECTS.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={effect === e.id}
                      className={`effect${effect === e.id ? " is-on" : ""}`}
                      onClick={() => setEffect(e.id)}
                    >
                      <span className="effect__glyph" aria-hidden="true">
                        {EFFECT_GLYPHS[e.id]}
                      </span>
                      <span className="effect__name">{e.name}</span>
                      <span className="effect__hint">{e.hint}</span>
                    </button>
                  ))}
                </div>
              </Field>

              {current.motif !== "none" && (
                <div className="options">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={motif}
                      onChange={(e) => setMotif(e.target.checked)}
                    />
                    <span>Afficher le décor de l&apos;occasion</span>
                  </label>
                </div>
              )}
            </section>

            <section className="panel">
              <h2>Le lien</h2>

              {props.mode === "create" ? (
                <p className="options__hint">
                  Adresse du lien : <code>{props.baseUrlLabel}/{effectiveSlug}</code>
                </p>
              ) : (
                <Field
                  label="Adresse du lien"
                  help="Fixe : le lien que tu as déjà envoyé continue de fonctionner."
                >
                  <p className="readonly-value">{props.slug}</p>
                </Field>
              )}

              <Field label="Nom de la carte">
                <input
                  type="text"
                  value={name}
                  aria-label="Nom de la carte"
                  maxLength={LIMITS.name}
                  placeholder="Anniversaire de Sophie"
                  onChange={(e) => setName(e.target.value)}
                />
                <Counter value={name} max={LIMITS.name} />
              </Field>

              <div className="options">
                <Optional
                  label="Personnaliser le lien"
                  help="Ce que montrent WhatsApp, Signal et les SMS quand tu colles le lien."
                  checked={linkOn}
                  onChange={(on) => {
                    setLinkOn(on);
                    if (!on) {
                      setLinkTitle("");
                      setCover("");
                    }
                  }}
                >
                  <Field
                    label="Texte affiché"
                    help="Le titre cliquable de l&apos;aperçu. À défaut, le message principal."
                  >
                    <input
                      type="text"
                      value={linkTitle}
                      aria-label="Texte affiché dans l'aperçu du lien"
                      maxLength={LIMITS.linkTitle}
                      placeholder={welcome.trim() || current.welcomeHint}
                      onChange={(e) => setLinkTitle(e.target.value)}
                    />
                    <Counter value={linkTitle} max={LIMITS.linkTitle} />
                  </Field>

                  <ImageField
                    label="Image affichée"
                    ariaLabel="Image d'aperçu du lien"
                    value={cover}
                    onChange={setCover}
                  />
                </Optional>
              </div>
            </section>
          </div>
        </div>
      )}

      <div className="editor__actions">
        <div className="editor__nav">
          {step > 1 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => goTo((step - 1) as StepNumber)}
            >
              ← Précédent
            </button>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPreview(true)}>
            Aperçu
          </button>
          {/* En édition on enregistre depuis n'importe quelle étape : la navigation
              passe donc par ces boutons secondaires et par les puces du haut. */}
          {mode === "edit" && !isLast && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={next}>
              Suivant →
            </button>
          )}
        </div>

        {mode === "edit" || isLast ? (
          <button type="button" className="btn" disabled={saving} onClick={submit}>
            {saving
              ? "Enregistrement…"
              : mode === "create"
                ? "Créer la page"
                : "Enregistrer les modifications"}
          </button>
        ) : (
          <button type="button" className="btn" onClick={next}>
            Suivant : {STEPS[step].title.toLowerCase()}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ISO (UTC) vers la valeur attendue par <input type="datetime-local">, qui est en
 * heure locale et sans fuseau. Sans cette conversion, la date affichee serait
 * decalee de l'ecart avec UTC.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Une cause d'échec précise vaut mieux qu'un « ça n'a pas marché » générique. */
function failureHint(reason?: string): string {
  switch (reason) {
    case "login_required":
      return "Ce site n'ouvre pas ses pages aux robots. Colle une adresse d'image ou téléverse une photo.";
    case "blocked":
      return "Le site a refusé la requête. Colle une adresse d'image ou téléverse une photo.";
    case "unreachable":
      return "Page injoignable. Vérifie l'adresse, ou remplis le titre et l'image à la main.";
    case "not_html":
      return "Cette adresse ne pointe pas vers une page web. Si c'est déjà une image, colle-la dans le champ Image.";
    default:
      return "Pas d'image trouvée sur cette page. Colle une adresse d'image ou téléverse une photo.";
  }
}

/**
 * Volontairement un <div> et pas un <label> : certains champs contiennent
 * plusieurs contrôles (dont le bouton de téléversement, qui est lui-même un
 * <label>), et imbriquer des <label> est invalide. L'association se fait par
 * aria-label sur chaque contrôle.
 */
function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {help && <span className="field__help">{help}</span>}
      {children}
    </div>
  );
}

/**
 * Une option facultative : une case à cocher, et le champ n'apparaît que si elle
 * est cochée. Décocher efface la valeur — un réglage invisible mais toujours
 * actif serait un piège.
 */
function Optional({
  label,
  help,
  checked,
  onChange,
  children,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`optional${checked ? " is-open" : ""}`}>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {label}
          {help && <em>{help}</em>}
        </span>
      </label>
      {checked && <div className="optional__body">{children}</div>}
    </div>
  );
}

/**
 * Un champ d'image autonome : adresse, televersement et collage.
 *
 * La photo d'en-tete et l'image d'apercu du lien n'acceptaient qu'une adresse
 * tapee, alors qu'une ligne de cadeau accepte depuis toujours un Ctrl+V. C'etait
 * le seul endroit du formulaire ou une capture d'ecran ne passait pas — et rien
 * ne le disait.
 *
 * Il porte son propre etat d'envoi plutot que de le remonter : rien d'autre dans
 * le formulaire n'a besoin de savoir qu'un televersement est en cours.
 */
function ImageField({
  label,
  help,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (url: string) => void;
  ariaLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function envoyer(file: File | null) {
    if (!file) return;
    setBusy(true);
    setHint(null);
    const result = await uploadImage(file);
    setBusy(false);
    if (result.ok) onChange(result.url);
    else setHint(result.error);
  }

  function coller(event: React.ClipboardEvent) {
    if (busy) return;

    const file = imageFromClipboard(event.clipboardData);
    if (file) {
      event.preventDefault();
      void envoyer(file);
      return;
    }

    // Le texte colle dans un champ de saisie lui appartient : on n'y touche pas.
    const cible = event.target as HTMLElement | null;
    if (cible && (cible.tagName === "INPUT" || cible.tagName === "TEXTAREA")) return;

    const url = imageUrlFromClipboard(event.clipboardData);
    if (url) {
      event.preventDefault();
      onChange(url);
      setHint("Adresse d'image collée.");
    }
  }

  return (
    <div onPaste={coller}>
      <Field label={label} help={help}>
        <div className="image-field">
          {/* Focalisable au clavier, pour que Ctrl+V ait ou atterrir. */}
          <div
            className={`image-field__cible${busy ? " is-busy" : ""}`}
            tabIndex={0}
            role="button"
            aria-label={`Coller une image pour : ${label}`}
            onPaste={coller}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" />
            ) : (
              <span>{busy ? "envoi…" : "colle une image ici"}</span>
            )}
          </div>

          <div className="image-field__reglages">
            <div className="inline">
              <input
                type="url"
                inputMode="url"
                value={value}
                aria-label={ariaLabel}
                placeholder="https://…/photo.jpg"
                onChange={(e) => onChange(e.target.value)}
              />
              <label className={`btn btn--ghost btn--sm${busy ? " is-disabled" : ""}`}>
                {busy ? "…" : "Téléverser"}
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  hidden
                  disabled={busy}
                  onChange={(e) => {
                    void envoyer(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>
        {hint && <p className="notice notice--info">{hint}</p>}
      </Field>
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`counter${value.length > max * 0.9 ? " is-near" : ""}`}>
      {value.length} / {max}
    </span>
  );
}
