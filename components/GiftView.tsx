"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GiftCover from "@/components/GiftCover";
import GiftMotif from "@/components/GiftMotif";
import { fontById, occasionById, openingById } from "@/lib/occasions";
import { LIMITS } from "@/lib/limits";
import { paletteStyle } from "@/lib/palettes";
import { isSealed } from "@/lib/types";
import type { Item, PublicPage } from "@/lib/types";

type Mode = "live" | "preview";

type Props = {
  page: PublicPage;
  mode?: Mode;
  /** "embedded" : rendu dans un cadre reduit (apercu miniature), pas plein ecran. */
  variant?: "full" | "embedded";
  /** Aperçu : quitter et revenir au formulaire. */
  onExitPreview?: () => void;
};

type Phase = "choosing" | "submitting" | "done" | "locked";

/**
 * Rythme de la revelation. Ces trois valeurs doublent `--reveal-delay`,
 * `--reveal-step` et la duree de fermeture du voile, declarees dans globals.css :
 * le mouvement appartient au CSS, mais la barre de confirmation a besoin de
 * savoir quand le dernier cadeau a fini d'apparaitre pour monter apres lui.
 * Modifier l'un sans l'autre desynchronise l'entree.
 */
const REVEAL_DELAY_MS = 1500;
const REVEAL_STEP_MS = 260;
const COVER_CLOSE_MS = 950;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Le rendu que voit le receveur. Utilisé tel quel par /[slug] (page réelle) et
 * par l'aperçu du formulaire (mode "preview", aucune persistance) — c'est le
 * même composant des deux côtés, donc l'aperçu ne peut pas mentir.
 */
export default function GiftView({
  page,
  mode = "live",
  variant = "full",
  onExitPreview,
}: Props) {
  const alreadyChosen = Boolean(page.chosen_at);
  const [phase, setPhase] = useState<Phase>(alreadyChosen ? "locked" : "choosing");
  const [selectedId, setSelectedId] = useState<string | null>(page.chosen_item_id);
  const [error, setError] = useState<string | null>(null);

  const chosen = useMemo(
    () => page.items.find((i) => i.id === selectedId) ?? null,
    [page.items, selectedId],
  );

  // L'unique cadeau est retenu d'office : le bouton n'attend qu'une confirmation.
  useEffect(() => {
    if (page.items.length === 1) setSelectedId(page.items[0].id);
  }, [page.items]);

  const settled = phase === "done" || phase === "locked";

  // Un seul cadeau : il n'y a rien a choisir. La page devient une annonce, et le
  // bouton un accuse de reception — meme mecanique, autre intention.
  const solo = page.items.length === 1;
  const replyAllowed = page.theme.reply === true;
  const [reply, setReply] = useState("");

  // Le voile n'a de sens que tant qu'un choix est attendu : une page deja
  // choisie ou expiree doit montrer son etat tout de suite.
  const revealAt = page.reveal_at ? new Date(page.reveal_at) : null;
  const sealed = isSealed(page);
  // Une carte scellee garde son voile meme si le donneur l'avait desactive :
  // c'est lui qui porte le compte a rebours.
  const coverEnabled = (page.theme.cover !== false || sealed) && !alreadyChosen;
  const [opened, setOpened] = useState(!coverEnabled);
  const [closing, setClosing] = useState(false);

  // La cascade demarre en meme temps que le voile se leve, pas apres : sinon les
  // cartes restent visibles a pleine opacite pendant toute la fermeture, puis
  // repartent de zero — c'est ce qui donnait un clignotement.
  const revealing = opened || closing;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /**
   * La barre de confirmation monte depuis le bas une fois le dernier cadeau
   * installe : arriver avant eux, elle designerait un choix qui n'est pas encore
   * a l'ecran ; ancree en bas de fenetre, elle reste ensuite sous les yeux sans
   * qu'il faille faire defiler la page jusqu'en bas.
   */
  const [barIn, setBarIn] = useState(false);

  useEffect(() => {
    if (!revealing) {
      setBarIn(false);
      return;
    }
    if (prefersReducedMotion()) {
      setBarIn(true);
      return;
    }
    const last = REVEAL_DELAY_MS + Math.max(0, page.items.length - 1) * REVEAL_STEP_MS;
    const id = setTimeout(() => setBarIn(true), last);
    return () => clearTimeout(id);
  }, [revealing, page.items.length]);

  // `useState` ne lit sa valeur initiale qu'au montage. Sans cette synchro, couper
  // le voile depuis le formulaire ne changeait rien a l'apercu deja affiche.
  useEffect(() => {
    setClosing(false);
    setOpened(!coverEnabled);
  }, [coverEnabled]);

  // Tant que le voile est la, la page derriere ne doit pas defiler.
  //
  // Uniquement sur la vraie page : dans l'apercu plein ecran, c'est le formulaire
  // qui tient deja ce verrou. Deux composants pilotant le meme style global, le
  // premier a relacher effaçait le verrou de l'autre.
  useEffect(() => {
    if (opened || variant !== "full" || mode !== "live") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [opened, variant, mode]);

  function openCover() {
    if (prefersReducedMotion()) {
      setOpened(true);
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => setOpened(true), COVER_CLOSE_MS);
  }

  async function confirm() {
    if (!selectedId || phase === "submitting") return;
    setError(null);

    if (mode === "preview") {
      setPhase("done");
      return;
    }

    setPhase("submitting");
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(page.slug)}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedId, reply: replyAllowed ? reply : "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Le choix n'a pas pu être enregistré.");
        setPhase("choosing");
        return;
      }
      setPhase("done");
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
      setPhase("choosing");
    }
  }

  const occasion = occasionById(page.theme.occasion);
  const skin = {
    ...paletteStyle(page.theme.palette),
    "--font-title": fontById(page.theme.font).cssVar,
  } as React.CSSProperties;
  const rootClass = `gift-root${variant === "embedded" ? " gift-root--embedded" : ""}`;
  const motif = page.theme.motif === false ? "none" : occasion.motif;
  const intro = page.intro_message.trim() || occasion.intro;

  if (settled) {
    return (
      <div className={rootClass} style={skin}>
        <GiftMotif kind={motif} />
        <div className="shell shell--flush">
          <div className="state fade-in">
            <div className="state__seal" aria-hidden="true">
              ✓
            </div>
          <h1>{page.thank_you_message}</h1>
          {chosen && (
            <>
              <p>
                {solo ? "Ton cadeau : " : "Ton choix : "}
                <strong>{chosen.label}</strong>
              </p>
              <div className="chosen-recap">
                <GiftCard item={chosen} selected disabled />
              </div>
            </>
          )}
          {(reply.trim() || page.reply_message.trim()) && (
            <p className="state__reply">« {reply.trim() || page.reply_message} »</p>
          )}
          {page.signature.trim() && <p className="signature">{page.signature}</p>}
          {mode === "preview" && (
            <div className="btn-row" style={{ justifyContent: "center", marginTop: "2rem" }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPhase("choosing")}>
                Rejouer l&apos;aperçu
              </button>
              {onExitPreview && (
                <button type="button" className="btn btn--sm" onClick={onExitPreview}>
                  Revenir au formulaire
                </button>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass} style={skin}>
      <GiftMotif kind={motif} />
      <div className="shell">
        {page.header_image_url && (
          <div className="gift-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.header_image_url} alt="" />
          </div>
        )}

        <header className="gift-head">
          {page.recipient_name && <p className="gift-to">Pour {page.recipient_name}</p>}
          <p className="eyebrow">{intro}</p>
          <h1>{page.welcome_message}</h1>
          <p className="lede">
            {solo ? "C'est pour toi." : "Choisis celui qui te fait le plus envie."}
          </p>
        </header>

        <ul
          className={`items items--${page.theme.layout === "list" ? "list" : "grid"}${
            revealing ? " is-revealed" : ""
          }`}
        >
          {page.items.map((item, index) => (
            <li key={item.id} style={{ "--i": index } as React.CSSProperties}>
              <GiftCard
                item={item}
                selected={!solo && item.id === selectedId}
                disabled={solo}
                onSelect={solo ? undefined : () => setSelectedId(item.id)}
              />
            </li>
          ))}
        </ul>

        {error && (
          <p className="notice notice--error" style={{ marginTop: "1.25rem" }} role="alert">
            {error}
          </p>
        )}

        {replyAllowed && (
          <div className="reply">
            <label className="reply__label" htmlFor="reply">
              Un mot à laisser ? <span>Facultatif</span>
            </label>
            <textarea
              id="reply"
              value={reply}
              maxLength={LIMITS.reply}
              rows={2}
              placeholder="Merci, ça me fait très plaisir…"
              onChange={(e) => setReply(e.target.value)}
            />
          </div>
        )}

        {page.signature.trim() && <p className="signature">{page.signature}</p>}

        <p className="made-with">
          Page-cadeau générée avec <strong>Givly</strong>
        </p>
      </div>

      <div className={`confirm-bar${barIn ? "" : " confirm-bar--waiting"}`}>
        <div className="confirm-bar__inner">
          <button
            type="button"
            className="btn"
            disabled={!selectedId || phase === "submitting"}
            onClick={confirm}
          >
            {phase === "submitting"
              ? "Enregistrement…"
              : solo
                ? "Merci !"
                : selectedId
                  ? "Confirmer mon choix"
                  : "Sélectionne un cadeau"}
          </button>
        </div>
      </div>

      {!opened && (
        <GiftCover
          to={page.recipient_name}
          intro={intro}
          title={page.welcome_message}
          motif={motif}
          style={openingById(page.theme.opening).id}
          sealedUntil={sealed ? revealAt : null}
          closing={closing}
          onOpen={openCover}
        />
      )}
    </div>
  );
}

export function GiftCard({
  item,
  selected,
  dimmed,
  disabled,
  onSelect,
}: {
  item: Item;
  selected?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      className={`card${dimmed ? " card--dimmed" : ""}`}
      aria-pressed={Boolean(selected)}
      disabled={disabled}
      onClick={onSelect}
    >
      <div className="thumb">
        {item.image_url ? (
          // Les photos produit ont des proportions imprevisibles (une fiche Amazon
          // carree perdrait 25 % en haut et en bas avec un recadrage). On affiche
          // donc l'image entiere, sur un fond floute tire d'elle-meme pour que le
          // cadre reste plein sans rien couper.
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="thumb__blur"
              src={item.image_url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="thumb__img" src={item.image_url} alt="" loading="lazy" decoding="async" />
          </>
        ) : (
          <span className="thumb__initial" aria-hidden="true">
            {initials(item.label)}
          </span>
        )}
      </div>
      <div className="card__body">
        <h2 className="card__label">{item.label}</h2>
        {item.note && <p className="card__note">{item.note}</p>}
      </div>
      <span className="card__check" aria-hidden="true">
        ✓
      </span>
    </button>
  );
}

function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
