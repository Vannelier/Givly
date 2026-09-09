"use client";

import { useState } from "react";
import Link from "next/link";
import CopyLine from "@/components/CopyLine";
import CardPreview from "@/components/CardPreview";
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
          moment ce que verra la personne.
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

        {/*
          Le lien de recuperation passe devant, et pulse.

          C'est le seul des deux qu'on ne peut pas retrouver : le lien public
          part dans une conversation, celui-ci n'existe que sur cet ecran. Il
          etait en troisieme position, sous un QR code qui prend toute la
          largeur — c'est-a-dire souvent hors de l'ecran au telephone, la ou on
          ferme l'onglet en croyant avoir fini.
        */}
        <div className="link-box link-box--admin link-box--pulse">
          <span className="link-box__label">Ton lien de récupération</span>
          <span className="link-box__help">
            <strong>Garde-le maintenant</strong> : il n&apos;est affiché qu&apos;ici, et c&apos;est
            le seul moyen de revenir voir le cadeau choisi.
          </span>
          <CopyLine value={result.adminUrl} />
        </div>

        <div className="link-box">
          <span className="link-box__label">Lien à envoyer</span>
          <span className="link-box__help">C&apos;est ce que reçoit la personne.</span>
          <CopyLine value={result.publicUrl} />
        </div>

        {/*
          Un apercu de la carte, et le chemin vers l'atelier.

          L'atelier complet vivait ici, deplie : carrousel, champs de texte,
          feuille pleine largeur. C'etait la bonne intention — montrer des cet
          ecran qu'une carte existe — mais au mauvais format : sur un ecran de
          fin ou l'on vient chercher deux liens, il occupait plus de place que
          les liens eux-memes et repoussait les deux boutons hors de vue.
        */}
        <CardPreview
          url={result.publicUrl}
          to={result.carte.to}
          intro={result.carte.intro}
          title={result.carte.title}
          signature={result.carte.signature}
          theme={result.carte.theme}
          printHref={`${result.adminUrl}/imprimer`}
        />

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
