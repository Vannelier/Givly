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
  link_title: "",
  recipient_name: "",
  header_image_url: null,
  reveal_at: null,
  welcome_message: "",
  open_label: "",
  wait_message: "",
  items_title: "",
  items_message: "",
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
  return (
    <div className="shell shell--flush">
      <div className="state fade-in" style={{ textAlign: "left" }}>
        <div className="state__seal" aria-hidden="true">
          ✓
        </div>
        <h1 style={{ textAlign: "center" }}>Ta page est prête</h1>

        <div className="link-box">
          <span className="link-box__label">Lien à envoyer</span>
          <span className="link-box__help">C&apos;est ce que reçoit la personne.</span>
          <CopyLine value={result.publicUrl} />
        </div>

        <QrCard url={result.publicUrl} />

        <div className="link-box link-box--admin">
          <span className="link-box__label">Ton lien de récupération</span>
          <span className="link-box__help">
            Garde-le bien : c&apos;est le seul moyen de voir le cadeau choisi.
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
