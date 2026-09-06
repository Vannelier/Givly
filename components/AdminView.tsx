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
  recipient_name: string;
  header_image_url: string | null;
  reveal_at: string | null;
  reply_message: string;
  sealed: boolean;
  welcome_message: string;
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
    recipient_name: page.recipient_name,
    header_image_url: page.header_image_url,
    reveal_at: page.reveal_at,
    welcome_message: page.welcome_message,
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

      <section className="panel">
        <h2>État</h2>
        <dl className="status">
          <div className="status__row">
            <dt>Statut</dt>
            <dd>
              {page.expired ? (
                <span className="pill pill--expired">Expirée</span>
              ) : page.sealed ? (
                <span className="pill pill--waiting">Scellée</span>
              ) : page.locked ? (
                <span className="pill pill--chosen">Choix enregistré</span>
              ) : (
                <span className="pill pill--waiting">En attente</span>
              )}
            </dd>
          </div>
          <div className="status__row">
            <dt>Consultations</dt>
            <dd>{page.view_count}</dd>
          </div>
          {page.reveal_at && (
            <div className="status__row">
              <dt>{page.sealed ? "S'ouvre le" : "Ouverte depuis le"}</dt>
              <dd>{formatDateTime(page.reveal_at)}</dd>
            </div>
          )}
          <div className="status__row">
            <dt>Créée le</dt>
            <dd>{formatDateTime(page.created_at)}</dd>
          </div>
          <div className="status__row">
            <dt>Dernière modification</dt>
            <dd>{formatDateTime(page.updated_at)}</dd>
          </div>
          <div className="status__row">
            <dt>{page.locked ? "Choix fait le" : "Expire le"}</dt>
            <dd>
              {page.locked
                ? formatDateTime(page.chosen_at)
                : page.expires_at
                  ? formatDateTime(page.expires_at)
                  : "n'expire pas"}
            </dd>
          </div>
        </dl>

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

      {editable ? (
        <>
          <section className="panel" style={{ paddingBottom: "0.6rem" }}>
            <h2>Modifier la page</h2>
            <p className="help">
              Les liens ne changent pas : celui que tu as déjà envoyé continue de fonctionner.
            </p>
          </section>
          <PageEditor mode="edit" initial={initial} adminToken={token} slug={page.slug} />
        </>
      ) : (
        <section className="panel">
          <h2>Modification impossible</h2>
          <p className="help" style={{ marginBottom: 0 }}>
            {page.locked
              ? "Le choix a été fait : la page est figée sur ce choix. Tu peux encore la supprimer."
              : "La page a expiré : elle n'est plus modifiable. Tu peux encore la supprimer."}
          </p>
        </section>
      )}

      <section className="panel">
        <h2>Supprimer</h2>
        <p className="help">
          Définitif. La page et son contenu disparaissent, les deux liens cessent de fonctionner.
        </p>
        {error && (
          <p className="notice notice--error" role="alert" style={{ marginBottom: "0.8rem" }}>
            {error}
          </p>
        )}
        {confirming ? (
          <div className="btn-row">
            <button type="button" className="btn btn--danger btn--sm" disabled={deleting} onClick={remove}>
              {deleting ? "Suppression…" : "Oui, supprimer définitivement"}
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
            Supprimer cette page
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
