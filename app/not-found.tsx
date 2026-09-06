import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell shell--flush">
      <div className="state">
        <h1>Rien à cette adresse</h1>
        <p>Le lien est peut-être incomplet, ou la page a été supprimée.</p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "2rem" }}>
          <Link className="btn btn--ghost btn--sm" href="/">
            Aller à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
