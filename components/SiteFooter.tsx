import Link from "next/link";

/**
 * Le pied de page du site public.
 *
 * Il porte les liens légaux — c'est là qu'on les cherche, et c'est aussi ce qui
 * les rend explorables : sans lien depuis une page indexée, une page légale
 * n'existe pour aucun moteur, même déclarée dans le sitemap.
 *
 * Absent des pages-cadeau et de la vue d'administration : la personne qui reçoit
 * une carte n'a pas à voir les conditions d'utilisation d'un outil qu'elle
 * n'utilise pas, et la page doit rester celle du donneur, pas celle de Givly.
 */
export default function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="lp-foot">
      {note && <p>{note}</p>}

      <nav className="lp-foot__nav" aria-label="Liens de bas de page">
        <Link href="/questions">Questions fréquentes</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/conditions">Conditions</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
      </nav>

      <p className="lp-foot__mark">Givly</p>
    </footer>
  );
}
