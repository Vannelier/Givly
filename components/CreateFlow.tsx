"use client";

import { useState } from "react";
import Link from "next/link";
import CopyLine from "@/components/CopyLine";
import QrCard from "@/components/QrCard";
import PageEditor, { type CreateResult, type EditorInitial } from "@/components/editor/PageEditor";
import { DEFAULT_THEME } from "@/lib/types";

const EMPTY: EditorInitial = {
  name: "",
  intro_message: "",
  signature: "",
  recipient_name: "",
  header_image_url: null,
  reveal_at: null,
  welcome_message: "",
  thank_you_message: "",
  cover_image_url: null,
  theme: { ...DEFAULT_THEME },
  items: [],
};

export default function CreateFlow({ baseUrlLabel }: { baseUrlLabel: string }) {
  const [created, setCreated] = useState<CreateResult | null>(null);

  if (created) return <Created result={created} />;

  return (
    <div className="shell shell--wide">
      <header className="hero">
        <Link className="back-link" href="/">
          ← Givly
        </Link>
        <h1>Compose ta page-cadeau</h1>
        <p>
          Deux à dix idées, un message, et c&apos;est prêt. Le bouton « Aperçu » te montre à tout
          moment ce que verra la personne — rien n&apos;est enregistré tant que tu n&apos;as pas créé
          la page.
        </p>
      </header>

      <PageEditor mode="create" initial={EMPTY} baseUrlLabel={baseUrlLabel} onCreated={setCreated} />
    </div>
  );
}

function Created({ result }: { result: CreateResult }) {
  const expires = result.expiresAt
    ? new Date(result.expiresAt).toLocaleDateString("fr-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="shell shell--flush">
      <div className="state fade-in" style={{ textAlign: "left" }}>
        <div className="state__seal" aria-hidden="true">
          ✓
        </div>
        <h1 style={{ textAlign: "center" }}>Ta page est prête</h1>

        <div className="link-box">
          <span className="link-box__label">Lien à envoyer</span>
          <span className="link-box__help">
            C&apos;est ce que reçoit la personne. Collé dans WhatsApp ou un SMS, il s&apos;affiche
            avec ton message et une image.
          </span>
          <CopyLine value={result.publicUrl} />
        </div>

        <QrCard url={result.publicUrl} />

        <div className="link-box link-box--admin">
          <span className="link-box__label">Lien d&apos;administration — garde-le</span>
          <span className="link-box__help">
            Il ne sera plus affiché. C&apos;est le seul moyen de voir le choix, de modifier la page
            et de la supprimer. Enregistre-le quelque part maintenant.
          </span>
          <CopyLine value={result.adminUrl} />
        </div>

        {result.warnings?.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            {result.warnings.map((w) => (
              <p className="notice notice--warn" key={w.message}>
                {w.message}
              </p>
            ))}
          </div>
        )}

        {expires && (
          <p className="notice notice--info" style={{ marginTop: "1rem" }}>
            Sans choix, la page expire le {expires}.
          </p>
        )}

        <div className="btn-row" style={{ marginTop: "1.75rem" }}>
          <a className="btn btn--sm" href={result.adminUrl}>
            Ouvrir l&apos;administration
          </a>
          <a className="btn btn--ghost btn--sm" href={result.publicUrl} target="_blank" rel="noreferrer">
            Voir la page publique
          </a>
        </div>
      </div>
    </div>
  );
}
