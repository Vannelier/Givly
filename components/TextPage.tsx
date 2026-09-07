import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

/**
 * La coquille commune aux pages de texte : questions, contact, confidentialité,
 * conditions, mentions légales.
 *
 * Un seul `h1` par page, le reste en `h2` : c'est ce que lit un moteur pour
 * comprendre la hiérarchie, et ce que suit un lecteur d'écran pour naviguer.
 * La date de mise à jour est affichée quand elle existe — sur une page qui
 * engage, un texte sans date ne dit pas s'il est encore valable.
 */
export default function TextPage({
  titre,
  chapo,
  miseAJour,
  children,
}: {
  titre: string;
  chapo?: string;
  miseAJour?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="landing">
      <article className="prose">
        <Link className="back-link" href="/">
          ← Givly
        </Link>

        <h1>{titre}</h1>
        {chapo && <p className="prose__chapo">{chapo}</p>}
        {miseAJour && (
          <p className="prose__date">
            Dernière mise à jour : <time dateTime={miseAJour}>{formatDate(miseAJour)}</time>
          </p>
        )}

        {children}
      </article>

      <SiteFooter />
    </main>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
