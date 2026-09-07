"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GiftCover from "@/components/GiftCover";
import GiftEffect from "@/components/GiftEffect";
import GiftMotif from "@/components/GiftMotif";
import {
  ITEMS_MESSAGE_HINT,
  ITEMS_TITLE_HINT,
  effectById,
  fontById,
  occasionById,
  openingById,
} from "@/lib/occasions";
import { LIMITS } from "@/lib/limits";
import { paletteStyle } from "@/lib/palettes";
import { isSealed, replyWindowOpen } from "@/lib/types";
import type { Item, PublicPage } from "@/lib/types";

type Mode = "live" | "preview";

/** Ecran que l'apercu doit montrer, pour suivre le cadre en cours d'edition. */
export type PreviewScreen = "intro" | "cadeaux" | "choix";

type Props = {
  page: PublicPage;
  mode?: Mode;
  /**
   * Apercu uniquement : force l'ecran affiche. Le formulaire s'en sert pour que
   * l'apercu montre l'ecran qu'on est en train de regler.
   */
  previewScreen?: PreviewScreen;
  /** "embedded" : rendu dans un cadre reduit (apercu miniature), pas plein ecran. */
  variant?: "full" | "embedded";
  /** Aperçu : quitter et revenir au formulaire. */
  onExitPreview?: () => void;
};

type Phase = "choosing" | "submitting" | "done" | "locked";
/** Etat de la zone de mot, sur l'ecran de confirmation. */
type ReplyPhase = "idle" | "writing" | "sending" | "sent";

/**
 * Rythme de la revelation. Ces valeurs doublent celles de globals.css : le
 * mouvement appartient au CSS, mais la barre de confirmation a besoin de savoir
 * quand le dernier cadeau a fini d'apparaitre pour monter apres lui. Modifier
 * l'un sans l'autre desynchronise l'entree.
 *
 * Tout se compte a partir du retrait du voile, pas du clic : c'est `COVER_CLOSE_MS`
 * qui separe les deux, et l'entree du titre occupe l'intervalle suivant.
 */
const REVEAL_APRES_TITRE_MS = 1200;
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
  previewScreen,
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

  /*
   * Le mot du receveur arrive apres le choix, plus a cote de lui : la zone de
   * texte posee sous les cadeaux se lisait comme une case a remplir avant de
   * pouvoir confirmer, alors qu'elle etait facultative. Le choix part seul, et
   * l'ecran de confirmation propose ensuite d'ecrire.
   */
  const replyAllowed = page.theme.reply === true;
  const [reply, setReply] = useState("");
  const [replyPhase, setReplyPhase] = useState<ReplyPhase>("idle");
  const [replyError, setReplyError] = useState<string | null>(null);
  const sentReply = page.reply_message.trim();

  /*
   * Le delai de reponse depend de l'heure courante, qui differe forcement entre
   * le rendu serveur et le navigateur. L'evaluer avant le montage ferait diverger
   * l'hydratation sur une carte choisie il y a presque une heure ; on attend donc
   * d'etre monte. Un choix confirme dans cette session ouvre la fenetre sans
   * calcul : il vient d'avoir lieu.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    const depart = (coverEnabled ? COVER_CLOSE_MS : 0) + REVEAL_APRES_TITRE_MS;
    const last = depart + Math.max(0, page.items.length - 1) * REVEAL_STEP_MS;
    const id = setTimeout(() => setBarIn(true), last);
    return () => clearTimeout(id);
  }, [revealing, coverEnabled, page.items.length]);

  // `useState` ne lit sa valeur initiale qu'au montage. Sans cette synchro, couper
  // le voile depuis le formulaire ne changeait rien a l'apercu deja affiche.
  useEffect(() => {
    setClosing(false);
    setOpened(!coverEnabled);
  }, [coverEnabled]);

  /*
   * L'apercu suit le cadre qu'on modifie.
   *
   * Regler le titre de l'ecran des cadeaux pendant que l'apercu affiche encore
   * le voile revenait a travailler a l'aveugle. Le passage au cadre « Cadeaux »
   * leve donc le voile — avec son animation, pas d'un coup sec : c'est aussi ce
   * que le donneur veut verifier.
   *
   * N'agit qu'en apercu : sur la vraie page, c'est le receveur qui ouvre.
   */
  useEffect(() => {
    if (mode !== "preview" || !previewScreen) return;

    if (previewScreen === "choix") {
      // L'ecran de confirmation n'a de sens qu'avec un cadeau retenu ; sans
      // selection il serait vide, alors qu'on vient justement le regler.
      setSelectedId((actuel) => actuel ?? page.items[0]?.id ?? null);
      setPhase("done");
      return;
    }

    setPhase("choosing");

    if (previewScreen === "intro") {
      setClosing(false);
      setOpened(!coverEnabled);
      return;
    }

    // « Cadeaux » : rien a faire si le voile est deja leve — le rejouer a chaque
    // clic dans le cadre rendrait le reglage penible.
    if (!opened && !closing) openCover();
    // `opened` et `closing` sont volontairement hors des dependances : les
    // inclure relancerait cet effet au milieu de l'ouverture qu'il vient de
    // declencher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewScreen, mode, coverEnabled, page.items]);

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
        body: JSON.stringify({ itemId: selectedId }),
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

  /**
   * Le mot part dans une seconde requete, apres le choix. Une page deja choisie
   * n'accepte qu'une ecriture : le garde est pose en SQL, cote route.
   */
  async function sendReply() {
    const mot = reply.trim();
    if (!mot || replyPhase === "sending") return;
    setReplyError(null);

    if (mode === "preview") {
      setReplyPhase("sent");
      return;
    }

    setReplyPhase("sending");
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(page.slug)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: mot }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setReplyError(data.error ?? "Le mot n'a pas pu être envoyé.");
        setReplyPhase("writing");
        return;
      }
      setReplyPhase("sent");
    } catch {
      setReplyError("Connexion perdue. Vérifie ta connexion et réessaie.");
      setReplyPhase("writing");
    }
  }

  const occasion = occasionById(page.theme.occasion);
  const skin = {
    ...paletteStyle(page.theme.palette),
    "--font-title": fontById(page.theme.font).cssVar,
    /*
     * Le point zero de la mise en scene : l'instant ou le voile a fini de se
     * retirer. Sans voile, il n'y a rien a attendre. Le CSS en deduit l'entree du
     * titre puis l'arrivee des cadeaux.
     */
    "--ouverture-delai": coverEnabled ? `${COVER_CLOSE_MS}ms` : "0ms",
  } as React.CSSProperties;
  const rootClass = `gift-root${variant === "embedded" ? " gift-root--embedded" : ""}`;
  const motif = page.theme.motif === false ? "none" : occasion.motif;
  const effect = effectById(page.theme.effect).id;
  const intro = page.intro_message.trim() || occasion.intro;
  const openLabel = page.open_label.trim() || occasion.openHint;
  const waitMessage = page.wait_message.trim() || occasion.waitHint;
  const itemsTitle = page.items_title.trim() || ITEMS_TITLE_HINT;
  // Un cadeau unique n'est pas un choix : la page devient une annonce.
  const itemsMessage =
    page.items_message.trim() || (solo ? "C'est pour toi." : ITEMS_MESSAGE_HINT);

  /*
   * Quand le voile est actif, c'est lui qui porte le prenom, le mot d'ouverture
   * et le titre : les repeter sur l'ecran des cadeaux ferait lire deux fois la
   * meme chose a la suite. Sans voile, cet ecran est le premier et le seul —
   * il reprend donc l'intro a son compte.
   */
  const showIntroBlock = !coverEnabled;

  const canReply =
    replyAllowed &&
    !sentReply &&
    replyPhase !== "sent" &&
    (phase === "done" || (mounted && replyWindowOpen(page)));

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
          {/* Le mot deja enregistre, ou celui qui vient d'etre envoye. */}
          {(sentReply || replyPhase === "sent") && (
            <p className="state__reply">« {sentReply || reply.trim()} »</p>
          )}

          {/*
            Proposer d'ecrire seulement une fois le choix passe, et seulement si
            rien n'a encore ete laisse : la carte n'accepte qu'un mot.
          */}
          {canReply && (
            <div className="after-reply">
              {replyPhase === "idle" ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setReplyPhase("writing")}
                >
                  Laisser un mot
                </button>
              ) : (
                <>
                  <label className="reply__label" htmlFor="reply">
                    Ton mot <span>Facultatif</span>
                  </label>
                  <textarea
                    id="reply"
                    value={reply}
                    maxLength={LIMITS.reply}
                    rows={3}
                    autoFocus
                    placeholder="Merci, ça me fait très plaisir…"
                    onChange={(e) => setReply(e.target.value)}
                  />
                  {replyError && (
                    <p className="notice notice--error" role="alert">
                      {replyError}
                    </p>
                  )}
                  <div className="btn-row" style={{ justifyContent: "center" }}>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={!reply.trim() || replyPhase === "sending"}
                      onClick={sendReply}
                    >
                      {replyPhase === "sending" ? "Envoi…" : "Envoyer"}
                    </button>
                  </div>
                </>
              )}
            </div>
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
      {/* Monte avec la cascade : l'effet demarre a son montage, pas au chargement. */}
      {revealing && <GiftEffect kind={effect} />}
      <div className="shell">
        {page.header_image_url && (
          <div className="gift-banner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.header_image_url} alt="" />
          </div>
        )}

        {showIntroBlock && (
          <header className="gift-head">
            {page.recipient_name && <p className="gift-to">Pour {page.recipient_name}</p>}
            <p className="eyebrow">{intro}</p>
            <h1>{page.welcome_message}</h1>
          </header>
        )}

        <header className={`gift-items-head${revealing ? " is-revealed" : ""}`}>
          {/* Sans voile, le titre de l'intro est deja le h1 de la page. */}
          {showIntroBlock ? <h2>{itemsTitle}</h2> : <h1>{itemsTitle}</h1>}
          <p className="lede">{itemsMessage}</p>
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
          openLabel={openLabel}
          waitMessage={waitMessage}
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
