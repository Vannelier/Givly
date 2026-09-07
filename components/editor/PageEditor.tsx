"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GiftView from "@/components/GiftView";
import {
  ACCEPTED_IMAGE_TYPES,
  imageFromClipboard,
  imageUrlFromClipboard,
  uploadImage,
} from "@/components/editor/imageFile";
import { LIMITS } from "@/lib/limits";
import {
  FONTS,
  OCCASION_GROUPS,
  OPENINGS,
  fontById,
  occasionById,
  openingById,
  type FontId,
  type OccasionId,
  type OpeningId,
} from "@/lib/occasions";
import { PALETTES, paletteIdOf, type PaletteId } from "@/lib/palettes";
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

const STEPS = [
  { n: 1, title: "La carte", short: "Carte" },
  { n: 2, title: "Les cadeaux", short: "Cadeaux" },
  { n: 3, title: "La présentation", short: "Présentation" },
] as const;

type StepNumber = 1 | 2 | 3;

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
  const [furthest, setFurthest] = useState<StepNumber>(mode === "edit" ? 3 : 1);

  const [name, setName] = useState(initial.name);
  const [intro, setIntro] = useState(initial.intro_message);
  const [signature, setSignature] = useState(initial.signature);
  const [recipient, setRecipient] = useState(initial.recipient_name);
  const [header, setHeader] = useState(initial.header_image_url ?? "");
  // <input type="datetime-local"> attend "AAAA-MM-JJThh:mm" en heure locale.
  const [revealAt, setRevealAt] = useState(toLocalInput(initial.reveal_at));
  const [welcome, setWelcome] = useState(initial.welcome_message);
  const [thanks, setThanks] = useState(initial.thank_you_message);
  const [cover, setCover] = useState(initial.cover_image_url ?? "");
  const [layout, setLayout] = useState<Theme["layout"]>(initial.theme.layout ?? "grid");
  const [palette, setPalette] = useState<PaletteId>(paletteIdOf(initial.theme.palette));
  const [occasion, setOccasion] = useState<OccasionId>(occasionById(initial.theme.occasion).id);
  const [font, setFont] = useState<FontId>(fontById(initial.theme.font).id);
  const [motif, setMotif] = useState(initial.theme.motif !== false);
  const [opening, setOpeningStyle] = useState<OpeningId>(openingById(initial.theme.opening).id);
  const [replyOn, setReplyOn] = useState(initial.theme.reply === true);
  const [linkTitle, setLinkTitle] = useState(initial.link_title);
  const [sealEnabled, setSealEnabled] = useState(initial.theme.cover !== false);
  // Remonte GiftView pour rejouer l'ouverture sans recharger la page.
  const [replay, setReplay] = useState(0);
  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(initial.items));

  // Un repli est ouvert d'emblee si le champ porte deja une valeur : en edition,
  // rien de ce qui a ete rempli ne doit se cacher.
  const [introOn, setIntroOn] = useState(Boolean(initial.intro_message));
  const [signatureOn, setSignatureOn] = useState(Boolean(initial.signature));
  const [headerOn, setHeaderOn] = useState(Boolean(initial.header_image_url));
  const [linkOn, setLinkOn] = useState(
    Boolean(initial.link_title) || Boolean(initial.cover_image_url),
  );
  const [revealOn, setRevealOn] = useState(Boolean(initial.reveal_at));

  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);

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
    goTo(Math.min(3, step + 1) as StepNumber);
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
      if (name.trim().length > LIMITS.name) return `Le nom dépasse ${LIMITS.name} caractères.`;
      if (mode === "create") {
        const err = slugError(effectiveSlug);
        if (err) return err;
      }
      return null;
    }

    if (which === 2) {
      const filled = filledItems();
      if (filled.length < LIMITS.itemsMin) return "Il faut au moins un cadeau.";
      if (filled.length > LIMITS.itemsMax) return `Pas plus de ${LIMITS.itemsMax} cadeaux.`;
      return null;
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
    for (const which of [1, 2, 3] as StepNumber[]) {
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
        if ((data.field as string) === "slug") goTo(1);
        showError((data.error as string) ?? "L'enregistrement a échoué.");
        return;
      }

      const w = Array.isArray(data.warnings)
        ? (data.warnings as { message: string }[]).map((x) => x.message)
        : [];
      setWarnings(w);

      if (props.mode === "create") {
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
        <GiftView page={previewPage} mode="preview" onExitPreview={() => setPreview(false)} />
      </div>
    );
  }

  const isLast = step === 3;
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

      {step === 1 && (
        <section className="panel">
          <h2>La carte</h2>
          <p className="help">
            Le nom sert à t&apos;y retrouver et fabrique l&apos;adresse du lien. Il n&apos;est jamais
            montré à la personne qui reçoit.
          </p>

          <Field
            label="Nom de la carte"
            help="Facultatif. Vide : il se compose tout seul à partir de l&apos;occasion et du prénom."
          >
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

          <Field
            label="Prénom de la personne"
            help="Facultatif. Affiché en tête de la carte : « Pour Sophie »."
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

          {props.mode === "create" ? (
            <p className="options__hint">
              Adresse du lien : <code>{props.baseUrlLabel}/{effectiveSlug}</code>
            </p>
          ) : (
            <Field label="Adresse du lien" help="Fixe : le lien que tu as déjà envoyé continue de fonctionner.">
              <p className="readonly-value">
                {props.slug}
              </p>
            </Field>
          )}
        </section>
      )}

      {step === 2 && (
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

                <div className="row__grid">
                  <div
                    className={`row__preview${row.busy === "upload" ? " is-busy" : ""}`}
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

      {step === 3 && (
        <div className="step3">
          {/* Aperçu vivant : le même composant que la page réelle, en réduction.
              Il réagit à chaque réglage, sans passer par le plein écran. */}
          <aside className="step3__side">
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
                  <GiftView key={replay} page={previewPage} mode="preview" variant="embedded" />
                </div>
              </div>
            </div>
          </aside>

          <div className="step3__main">
            <section className="panel">
              <h2>L&apos;occasion</h2>
              <p className="help">
                Elle pose d&apos;un coup une palette, un décor et une formule d&apos;ouverture. Tout
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

            <section className="panel">
              <h2>Les mots</h2>

              <Field
                label="Message principal"
                help="Le titre de la page. Sert aussi à l&apos;aperçu du lien. Vide : la suggestion affichée est reprise."
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
                label="Message de fin"
                help="Affiché juste après la confirmation du choix. Vide : la suggestion affichée est reprise."
              >
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
                  label="Personnaliser le mot d&apos;ouverture"
                  help={`Sinon : « ${current.intro} »`}
                  checked={introOn}
                  onChange={(on) => {
                    setIntroOn(on);
                    if (!on) setIntro("");
                  }}
                >
                  <Field label="Mot d&apos;ouverture" help="La petite ligne au-dessus du titre.">
                    <input
                      type="text"
                      value={intro}
                      aria-label="Message d'ouverture"
                      maxLength={LIMITS.intro}
                      placeholder={current.intro}
                      onChange={(e) => setIntro(e.target.value)}
                    />
                    <Counter value={intro} max={LIMITS.intro} />
                  </Field>
                </Optional>

                <Optional
                  label="Signer la carte"
                  help="Une ligne en bas de page, pour dire de qui ça vient."
                  checked={signatureOn}
                  onChange={(on) => {
                    setSignatureOn(on);
                    if (!on) setSignature("");
                  }}
                >
                  <Field label="Signature">
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

              <div className="options">
                {current.motif !== "none" && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={motif}
                      onChange={(e) => setMotif(e.target.checked)}
                    />
                    <span>Afficher le décor de l&apos;occasion</span>
                  </label>
                )}

                <Optional
                  label="Ouvrir la carte d&apos;un geste"
                  help="Un voile opaque porte le mot d'ouverture et le titre ; les cadeaux apparaissent après."
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
                  label="Laisser un mot en répondant"
                  help="Un champ libre à côté du bouton. Inutile si tu fais scanner le QR devant la personne."
                  checked={replyOn}
                  onChange={setReplyOn}
                >
                  <p className="help" style={{ marginBottom: 0 }}>
                    Le mot apparaîtra dans ta vue d&apos;administration, avec le choix.
                  </p>
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
                </Optional>

                <Optional
                  label="Ajouter une photo d&apos;en-tête"
                  help="Une photo large en haut de la carte, au-dessus du message."
                  checked={headerOn}
                  onChange={(on) => {
                    setHeaderOn(on);
                    if (!on) setHeader("");
                  }}
                >
                  <Field label="Photo d&apos;en-tête">
                    <input
                      type="url"
                      inputMode="url"
                      value={header}
                      aria-label="Photo d'en-tête"
                      placeholder="https://…/photo.jpg"
                      onChange={(e) => setHeader(e.target.value)}
                    />
                  </Field>
                </Optional>

                <Optional
                  label="Soigner l&apos;aperçu du lien"
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

                  <Field label="Image affichée" help="À défaut, l&apos;image du premier cadeau.">
                    <input
                      type="url"
                      inputMode="url"
                      value={cover}
                      aria-label="Image d'aperçu du lien"
                      placeholder="https://…/photo.jpg"
                      onChange={(e) => setCover(e.target.value)}
                    />
                  </Field>
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

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`counter${value.length > max * 0.9 ? " is-near" : ""}`}>
      {value.length} / {max}
    </span>
  );
}
