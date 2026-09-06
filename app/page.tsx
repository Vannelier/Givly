import Link from "next/link";

export const metadata = {
  title: "Givly — offre le choix",
  description:
    "Compose une petite page-cadeau, envoie le lien, découvre ce qui a été choisi. Sans compte, sans paiement.",
};

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="lp-hero">
        <p className="eyebrow">Givly</p>
        <h1>Offre le choix.</h1>
        <p className="lp-sub">
          Rassemble deux à dix idées sur une petite page, envoie le lien, et découvre lequel a été
          retenu. Tu commandes et tu offres toi-même — rien ne passe par ici.
        </p>
        <div className="lp-cta">
          <Link className="btn btn--auto" href="/creer">
            Composer ma page-cadeau
          </Link>
        </div>
        <p className="lp-fine">Sans compte, sans paiement, sans adresse à donner.</p>
      </section>

      <section className="lp-demo" aria-labelledby="lp-demo-title">
        <div className="lp-demo__text">
          <h2 id="lp-demo-title">Voilà ce qui s&apos;ouvre en face</h2>
          <p>
            Un lien, une page à son nom, et un choix à faire. Pas de prix affichés, pas de formulaire
            à remplir : une carte à toucher, une confirmation, et c&apos;est terminé.
          </p>
        </div>

        {/* Maquette figée, purement décorative : la vraie page est rendue par GiftView. */}
        <div className="lp-phone" aria-hidden="true">
          <div className="lp-phone__screen">
            <p className="eyebrow">Un cadeau pour toi</p>
            <p className="lp-phone__title">Joyeux anniversaire.</p>
            <div className="lp-phone__cards">
              <div className="lp-phone__card">
                <span className="lp-phone__thumb lp-phone__thumb--a" />
                <span className="lp-phone__label">Collier Fluorite</span>
              </div>
              <div className="lp-phone__card is-picked">
                <span className="lp-phone__thumb lp-phone__thumb--b" />
                <span className="lp-phone__label">Dîner au restaurant</span>
                <span className="lp-phone__check">✓</span>
              </div>
            </div>
            <span className="lp-phone__button">Confirmer mon choix</span>
          </div>
        </div>
      </section>

      <section className="lp-steps">
        <h2>Comment ça marche</h2>
        <ol>
          <li>
            <span className="lp-step__num">1</span>
            <h3>Tu composes</h3>
            <p>
              Colle l&apos;adresse d&apos;un produit : le titre et l&apos;image sont récupérés tout
              seuls quand le site le permet. Sinon, tu remplis à la main — une photo depuis ton
              téléphone suffit.
            </p>
          </li>
          <li>
            <span className="lp-step__num">2</span>
            <h3>Tu envoies le lien</h3>
            <p>
              Collé dans WhatsApp, Signal ou un SMS, il s&apos;affiche avec ton message et une image,
              pas comme une adresse nue. Ou imprime son QR code et glisse-le dans une vraie carte.
            </p>
          </li>
          <li>
            <span className="lp-step__num">3</span>
            <h3>Tu découvres le choix</h3>
            <p>
              Un second lien, secret, n&apos;est qu&apos;à toi : il te montre ce qui a été choisi et
              quand. À toi de commander et d&apos;offrir.
            </p>
          </li>
        </ol>
      </section>

      <section className="lp-notes">
        <div>
          <h3>Rien à payer ici</h3>
          <p>Aucun paiement ne transite par la plateforme. Tu achètes le cadeau comme tu l&apos;aurais fait sans elle.</p>
        </div>
        <div>
          <h3>Aucune adresse collectée</h3>
          <p>En face, on ne saisit rien d&apos;autre que son choix. Pas de nom, pas d&apos;adresse, pas d&apos;e-mail.</p>
        </div>
        <div>
          <h3>Modifiable jusqu&apos;au choix</h3>
          <p>Tant que personne n&apos;a confirmé, tu peux tout corriger. Les liens déjà envoyés continuent de marcher.</p>
        </div>
      </section>

      <section className="lp-final">
        <h2>On compose ta carte ?</h2>
        <p>Deux idées suffisent pour commencer. Tu pourras tout modifier ensuite.</p>
        <Link className="btn btn--auto" href="/creer">
          Composer ma page-cadeau
        </Link>
        <p className="lp-fine">
          Une page gratuite reste en ligne 30 jours si personne ne choisit. Garde bien ton lien
          d&apos;administration : c&apos;est le seul moyen d&apos;y revenir.
        </p>
      </section>
    </main>
  );
}
