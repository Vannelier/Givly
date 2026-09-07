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
            <h3>Tu offres la carte</h3>
            <p>
              Collé dans WhatsApp, le lien s&apos;ouvre comme une carte : ton message, une image, son
              prénom. Ou imprime le QR code, glisse-le dans une enveloppe, et regarde-la l&apos;ouvrir
              devant toi.
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

      {/*
        Ce que le donneur y gagne, pas ce que l'outil sait faire. Une liste de
        reglages — palettes, polices, occasions — decrivait le produit sans
        jamais dire pourquoi on s'en servirait.

        Titres en <p> et non en <h3> : la section n'a plus de titre, et des h3
        sans h2 se rattacheraient au « Trois etapes » precedent.
      */}
      <section className="lp-craft">
        <ul className="lp-craft__grid">
          <li>
            <p className="lp-craft__title">Tu ne demandes rien</p>
            <p>
              « Tu veux quoi ? » met l&apos;autre au travail et dissout la surprise. Ici, tu as déjà
              cherché : il ne reste qu&apos;à désigner.
            </p>
          </li>
          <li>
            <p className="lp-craft__title">Personne ne passe commande</p>
            <p>
              Piocher dans une liste de souhaits revient à cocher une ligne. Chaque proposition vient
              de toi — ça se voit.
            </p>
          </li>
          <li>
            <p className="lp-craft__title">Aucun prix affiché</p>
            <p>
              Elle choisit ce qui lui plaît, sans calculer ce qu&apos;elle te coûte. Le malaise du
              montant n&apos;existe pas.
            </p>
          </li>
          <li>
            <p className="lp-craft__title">La surprise tient</p>
            <p>
              Elle ne sait pas ce que tu as réuni avant d&apos;ouvrir. Et la carte peut rester scellée
              jusqu&apos;au jour dit.
            </p>
          </li>
          <li>
            <p className="lp-craft__title">Rien à remplir en face</p>
            <p>
              Un décor, une écriture, des mots pour l&apos;occasion. Un seul geste à faire : choisir.
            </p>
          </li>
          <li>
            <p className="lp-craft__title">Un mot te revient</p>
            <p>
              Elle peut glisser un merci avec son choix. Tu le retrouves dans ta vue privée, avec le
              cadeau retenu.
            </p>
          </li>
        </ul>
      </section>

      {/* --- Objections, une ligne chacune. --- */}
      <section className="lp-notes">
        <div>
          <p className="lp-notes__title">Rien à payer ici</p>
          <p>Aucun paiement ne transite par Givly. Tu achètes le cadeau comme tu l&apos;aurais fait sans.</p>
        </div>
        <div>
          <p className="lp-notes__title">Aucune donnée demandée</p>
          <p>Pas de compte, et en face, rien à saisir d&apos;autre que son choix. Ni nom, ni adresse, ni e-mail.</p>
        </div>
        <div>
          <p className="lp-notes__title">Modifiable jusqu&apos;au choix</p>
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
