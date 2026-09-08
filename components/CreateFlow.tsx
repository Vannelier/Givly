"use client";

import { useState } from "react";
import Link from "next/link";
import CopyLine from "@/components/CopyLine";
import PrintableCard from "@/components/PrintableCard";
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
          La carte a imprimer, avec son carrousel de modeles, des cet ecran.
          Elle n'etait accessible qu'en passant par l'administration puis par
          « Imprimer » : le donneur qui veut glisser un QR dans une vraie carte
          ne decouvrait qu'il pouvait la styler qu'apres avoir cherche.
        */}
        <PrintableCard
          url={result.publicUrl}
          to={result.carte.to}
          intro={result.carte.intro}
          title={result.carte.title}
          signature={result.carte.signature}
          theme={result.carte.theme}
          slug={result.slug}
          variante="encart"
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
