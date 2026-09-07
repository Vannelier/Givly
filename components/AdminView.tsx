"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CopyLine from "@/components/CopyLine";
import QrCard from "@/components/QrCard";
import { GiftCard } from "@/components/GiftView";
import PageEditor, { type EditorInitial } from "@/components/editor/PageEditor";
import type { Item, Theme } from "@/lib/types";

export type AdminSnapshot = {
  slug: string;
  publicUrl: string;
  name: string;
  intro_message: string;
  signature: string;
  link_title: string;
  recipient_name: string;
  header_image_url: string | null;
  reveal_at: string | null;
  reply_message: string;
  sealed: boolean;
  welcome_message: string;
  open_label: string;
  wait_message: string;
  items_title: string;
  items_message: string;
  thank_you_message: string;
  cover_image_url: string | null;
  theme: Theme;
  items: Item[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  chosen_item_id: string | null;
  chosen_at: string | null;
  view_count: number;
  expired: boolean;
  locked: boolean;
};

export default function AdminView({ page, token }: { page: AdminSnapshot; token: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = page.items.find((i) => i.id === page.chosen_item_id) ?? null;
  const editable = !page.locked && !page.expired;

  const initial: EditorInitial = {
    slug: page.slug,
    name: page.name,
    intro_message: page.intro_message,
    signature: page.signature,
    link_title: page.link_title,
    recipient_name: page.recipient_name,
    header_image_url: page.header_image_url,
    reveal_at: page.reveal_at,
    welcome_message: page.welcome_message,
    open_label: page.open_label,
    wait_message: page.wait_message,
    items_title: page.items_title,
    items_message: page.items_message,
    thank_you_message: page.thank_you_message,
    cover_image_url: page.cover_image_url,
    theme: page.theme,
    items: page.items,
  };

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(token)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "La suppression a échoué.");
        setDeleting(false);
        return;
      }
      router.replace("/");
    } catch {
      setError("Connexion perdue. Réessaie.");
      setDeleting(false);
    }
  }

  return (
    <div className="shell shell--wide">
      <header className="hero">
        <p className="eyebrow">{page.name || "Administration"}</p>
        <h1>{page.locked ? "Le choix est fait" : "En attente d'un choix"}</h1>
      </header>

      {/* Le cadeau choisi passe avant les liens : c'est ce qu'on vient chercher
          ici une fois le choix fait, et les liens n'ont plus grand-chose à dire. */}
      {chosen && (
        <section className="panel">
          <h2>Cadeau choisi</h2>
          <p className="help">
            À toi de jouer : commande-le et offre-le. Rien n&apos;a transité par la plateforme.
          </p>
          <div style={{ maxWidth: "20rem" }}>
            <GiftCard item={chosen} selected disabled />
          </div>
          {page.reply_message.trim() && (
            <blockquote className="reply-quote">
              <p>« {page.reply_message} »</p>
            </blockquote>
          )}

          {chosen.source_url && (
            <p style={{ marginTop: "0.9rem", fontSize: "0.88rem" }}>
              <a href={chosen.source_url} target="_blank" rel="noreferrer">
                Ouvrir la page d&apos;origine ↗
              </a>
            </p>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Partager la carte</h2>

        {/* Seule date conservée : une carte scellée ne s'ouvre pas encore, et rien
            d'autre sur cette page ne le dirait. */}
        {page.reveal_at && (
          <p className="help">
            {page.sealed ? "S'ouvre le " : "Ouverte depuis le "}
            {formatDateTime(page.reveal_at)}.
          </p>
        )}

        <div className="link-box">
          <span className="link-box__label">Lien à envoyer</span>
          <CopyLine value={page.publicUrl} />
        </div>

        <QrCard url={page.publicUrl} />

        <div className="btn-row" style={{ marginTop: "0.85rem" }}>
          <Link className="btn btn--ghost btn--sm" href={`/admin/${token}/imprimer`}>
            Carte à imprimer
          </Link>
        </div>
      </section>

      {editable && (
        <>
          <section className="panel" style={{ paddingBottom: "0.6rem" }}>
            <h2>Modifier la page</h2>
            <p className="help">
              Les liens ne changent pas : celui que tu as déjà envoyé continue de fonctionner.
            </p>
          </section>
          <PageEditor mode="edit" initial={initial} adminToken={token} slug={page.slug} />
        </>
      )}

      {/* Une fois le choix fait, supprimer n'est plus une perte mais une fin de
          course : on range la carte plutôt qu'on ne l'efface. */}
      <section className="panel">
        <h2>{page.locked ? "Bien reçu ?" : "Ranger la carte"}</h2>
        <p className="help">
          {page.locked
            ? "Tu as noté le cadeau ? Tu peux clôturer : la page se referme pour de bon et les deux liens cessent de fonctionner."
            : "Définitif. La page et son contenu disparaissent, les deux liens cessent de fonctionner."}
        </p>
        {error && (
          <p className="notice notice--error" role="alert" style={{ marginBottom: "0.8rem" }}>
            {error}
          </p>
        )}
        {confirming ? (
          <div className="btn-row">
            <button type="button" className="btn btn--danger btn--sm" disabled={deleting} onClick={remove}>
              {deleting
                ? page.locked
                  ? "Clôture…"
                  : "Suppression…"
                : page.locked
                  ? "Oui, clôturer pour de bon"
                  : "Oui, supprimer définitivement"}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={deleting}
              onClick={() => setConfirming(false)}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirming(true)}>
            {page.locked ? "C'est noté, clôturer la page" : "Supprimer cette page"}
          </button>
        )}
      </section>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
