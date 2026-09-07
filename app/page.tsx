import Link from "next/link";

export const metadata = {
  title: "Givly — offre le choix",
  description:
    "L'inverse d'une liste de souhaits : tu réunis quelques idées sur une page, la personne choisit celle qu'elle préfère. Sans compte, sans paiement.",
};

export default function LandingPage() {
  return (
    <main className="landing">
      {/* --- Accroche : la promesse, la preuve, l'action, en un seul écran. --- */}
      <section className="lp-hero">
        <div className="lp-hero__text">
          <p className="eyebrow">Givly</p>
          <h1>Offrir sans se tromper.</h1>
          <p className="lp-sub">
            Tu réunis quelques idées de cadeaux sur une jolie page, tu envoies le lien. La personne
            choisit celle qui lui plaît le plus. Tu commandes et tu offres toi-même.
          </p>
          <div className="lp-cta">
            <Link className="btn btn--auto" href="/creer">
              Composer ma page-cadeau
            </Link>
            <span className="lp-cta__note">Gratuit · sans compte · trois étapes</span>
          </div>
        </div>

        {/* Maquette figée, purement décorative : la vraie page est rendue par GiftView. */}
        <div className="lp-phone" aria-hidden="true">
          <div className="lp-phone__screen">
            <p className="eyebrow">Joyeux anniversaire</p>
            <p className="lp-phone__title">Choisis le tien.</p>
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
              <div className="lp-phone__card">
                <span className="lp-phone__thumb lp-phone__thumb--c" />
                <span className="lp-phone__label">Week-end thermes</span>
              </div>
            </div>
            <span className="lp-phone__button">Confirmer mon choix</span>
          </div>
        </div>
      </section>

      {/* --- Le concept, expliqué par contraste : c'est le raccourci le plus court. --- */}
      <section className="lp-pitch" aria-labelledby="lp-pitch-title">
        <h2 id="lp-pitch-title">L&apos;inverse d&apos;une liste de souhaits.</h2>
        <div className="lp-pitch__grid">
          <div className="lp-pitch__col">
            <p className="lp-pitch__tag">Le cadeau deviné</p>
            <p>Tu choisis seul, tu croises les doigts. Et parfois, ça finit au fond d&apos;un placard.</p>
          </div>
          <div className="lp-pitch__col">
            <p className="lp-pitch__tag">La liste de souhaits</p>
            <p>On te dit quoi acheter, tu paies. Il ne reste plus grand-chose de toi dedans.</p>
          </div>
          <div className="lp-pitch__col is-highlight">
            <p className="lp-pitch__tag">Givly</p>
            <p>
              Tu proposes, l&apos;autre tranche. Ton attention reste entière, et le cadeau tombe juste.
            </p>
          </div>
        </div>
      </section>

      {/* --- Le mécanisme. Une phrase par étape, pas plus. --- */}
      <section className="lp-steps">
        <h2>Trois étapes, une seule fois</h2>
        <ol>
          <li>
            <span className="lp-step__num">1</span>
            <h3>Tu réunis les idées</h3>
            <p>
              Colle l&apos;adresse d&apos;un produit : le titre et la photo se remplissent le plus
              souvent tout seuls. Sinon, une photo depuis ton téléphone suffit.
            </p>
          </li>
          <li>
            <span className="lp-step__num">2</span>
            <h3>Tu envoies le lien</h3>
            <p>
              Dans WhatsApp ou un SMS, il s&apos;affiche avec ton message et une image. Ou glisse son
              QR code imprimé dans une vraie carte.
            </p>
          </li>
          <li>
            <span className="lp-step__num">3</span>
            <h3>Tu découvres le choix</h3>
            <p>
              Un second lien, secret, n&apos;est qu&apos;à toi : il te dit ce qui a été choisi, et
              quand. À toi de commander.
            </p>
          </li>
        </ol>
      </section>

      {/* --- Ce qui fait que c'est un cadeau, et pas un formulaire. --- */}
      <section className="lp-craft" aria-labelledby="lp-craft-title">
        <div className="lp-craft__head">
          <h2 id="lp-craft-title">Une carte, pas un sondage</h2>
          <p>
            Ce qui s&apos;ouvre en face doit ressembler à un cadeau. Alors tout est habillé, et rien
            n&apos;est à remplir.
          </p>
        </div>
        <ul className="lp-craft__grid">
          <li>
            <h3>15 occasions prêtes</h3>
            <p>Anniversaire, Noël, naissance, départ… chacune pose son décor, ses couleurs et ses mots.</p>
          </li>
          <li>
            <h3>8 palettes, 7 écritures</h3>
            <p>De la terracotta chaude à l&apos;encre sobre, du manuscrit à la calligraphie.</p>
          </li>
          <li>
            <h3>Une ouverture mise en scène</h3>
            <p>Un voile, un rideau ou une enveloppe se lève avant les cadeaux, un par un.</p>
          </li>
          <li>
            <h3>Une date d&apos;ouverture</h3>
            <p>Envoie le lien à l&apos;avance : la page reste scellée, avec un compte à rebours, jusqu&apos;au jour dit.</p>
          </li>
          <li>
            <h3>Aucun prix affiché</h3>
            <p>On choisit ce qui fait plaisir, pas ce qui coûte le moins cher.</p>
          </li>
          <li>
            <h3>Un mot en retour</h3>
            <p>Un mot peut accompagner le choix. Tu le retrouves dans ta vue privée.</p>
          </li>
        </ul>
      </section>

      {/* --- Objections, une ligne chacune. --- */}
      <section className="lp-notes">
        <div>
          <h3>Rien à payer ici</h3>
          <p>Aucun paiement ne transite par Givly. Tu achètes le cadeau comme tu l&apos;aurais fait sans.</p>
        </div>
        <div>
          <h3>Aucune donnée demandée</h3>
          <p>Pas de compte, et en face, rien à saisir d&apos;autre que son choix. Ni nom, ni adresse, ni e-mail.</p>
        </div>
        <div>
          <h3>Modifiable jusqu&apos;au choix</h3>
          <p>Tant que personne n&apos;a confirmé, tu corriges tout. Les liens déjà envoyés continuent de marcher.</p>
        </div>
      </section>

      <section className="lp-final">
        <h2>On compose ta carte ?</h2>
        <p>Deux idées suffisent pour commencer, dix au maximum. Tout reste modifiable ensuite.</p>
        <Link className="btn btn--auto" href="/creer">
          Composer ma page-cadeau
        </Link>
      </section>

      <footer className="lp-foot">
        <p>
          Une page reste en ligne 30 jours si personne ne choisit. Garde ton lien
          d&apos;administration : c&apos;est le seul moyen d&apos;y revenir.
        </p>
        <p className="lp-foot__mark">Givly</p>
      </footer>
    </main>
  );
}
