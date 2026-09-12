import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

/*
 * Le titre porte ce qu'on cherche, pas ce qu'on est.
 *
 * « MyPresentsForYou — offre le choix » ne se trouve qu'en tapant « MyPresentsForYou », c'est-à-dire
 * en connaissant déjà le site. Le titre décrit donc d'abord l'action — offrir en
 * laissant choisir — et garde la marque en fin de ligne, là où elle ne prend pas
 * la place des mots utiles. Environ 60 signes : au-delà, Google coupe.
 */
export const metadata: Metadata = {
  title: "Offrir en laissant choisir le cadeau — MyPresentsForYou",
  description:
    "Réunis quelques idées de cadeau sur une page, envoie le lien, découvre celle qui a été retenue. Gratuit, sans compte et sans paiement.",
  alternates: { canonical: "/" },
  keywords: [
    "offrir un cadeau au choix",
    "laisser choisir son cadeau",
    "idées cadeau à envoyer",
    "carte cadeau personnalisée",
    "alternative à la liste de souhaits",
  ],
};

/*
 * Décrit le site pour les moteurs : de quoi il s'agit, et que c'est gratuit.
 * `WebApplication` plutôt que `WebSite` — c'est un outil qu'on utilise, pas un
 * contenu qu'on lit — et un `offers` à zéro, qui est la façon normalisée de dire
 * « gratuit » plutôt que de l'espérer compris depuis la description.
 */
const DONNEES_STRUCTUREES = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MyPresentsForYou",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Tout navigateur web",
  inLanguage: "fr",
  description:
    "Réunis quelques idées de cadeau sur une page, envoie le lien, découvre celle qui a été retenue.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  featureList: [
    "Jusqu'à dix propositions par carte",
    "Aucun compte requis",
    "QR code à imprimer",
    "Carte modifiable jusqu'au choix",
  ],
};

export default function LandingPage() {
  return (
    <main className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES) }}
      />
      {/* --- Accroche : la promesse, la preuve, l'action, en un seul écran. --- */}
      <section className="lp-hero">
        <div className="lp-hero__text">
          <p className="eyebrow">MyPresentsForYou</p>
          <h1>Offrir sans se tromper.</h1>
          <p className="lp-sub">
            Tu réunis quelques idées de cadeaux sur une jolie page, tu envoies le lien. La personne
            choisit celle qui lui plaît le plus. Tu commandes et tu offres toi-même.
          </p>
          <div className="lp-cta">
            <Link className="btn btn--auto" href="/creer">
              Composer ma page-cadeau
            </Link>
            <Link className="btn btn--ghost btn--auto" href="/exemple">
              Voir un exemple
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

      {/* --- Le mécanisme. Une phrase par étape, pas plus. --- */}
      <section className="lp-steps">
        <ol>
          <li>
            <span className="lp-step__num">1</span>
            <h2>Tu réunis les idées</h2>
            <p>
              Colle l&apos;adresse d&apos;un produit : le titre et la photo se remplissent le plus
              souvent tout seuls. Sinon, une photo depuis ton téléphone suffit.
            </p>
          </li>
          <li>
            <span className="lp-step__num">2</span>
            <h2>Tu offres la carte</h2>
            <p>
              Collé dans WhatsApp, le lien s&apos;ouvre comme une carte : ton message, une image, son
              prénom. Ou imprime le QR code, glisse-le dans une enveloppe, et regarde-la l&apos;ouvrir
              devant toi.
            </p>
          </li>
          <li>
            <span className="lp-step__num">3</span>
            <h2>Tu découvres le choix</h2>
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

        Titres en <p> et non en titres de niveau : la section n'a pas de titre
        propre, et un h3 ici se rattacherait a la derniere etape ci-dessus.
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
          <p>Aucun paiement ne transite par MyPresentsForYou. Tu achètes le cadeau comme tu l&apos;aurais fait sans.</p>
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
        <p>Deux idées cadeaux suffisent pour commencer, dix au maximum. Tout reste modifiable ensuite.</p>
        <Link className="btn btn--auto" href="/creer">
          Composer ma page-cadeau
        </Link>
      </section>

      <SiteFooter note="Une page reste en ligne 30 jours. Garde bien ton lien d'administration pour voir le cadeau désiré par la personne qui reçoit ta page-cadeau." />
    </main>
  );
}
