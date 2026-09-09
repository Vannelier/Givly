import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";

const MISE_A_JOUR = "2026-09-07";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — MyPresentsForYou",
  description:
    "Ce que MyPresentsForYou fait, ce qu'il ne fait pas, et ce qu'on attend de toi. Service gratuit, sans compte, sans paiement.",
  alternates: { canonical: "/conditions" },
};

export default function Conditions() {
  return (
    <TextPage
      titre="Conditions d'utilisation"
      chapo="Le service est gratuit et sans compte. Voici ce sur quoi nous nous engageons, et ce que nous te demandons en retour."
      miseAJour={MISE_A_JOUR}
    >
      <h2>Ce qu&apos;est MyPresentsForYou</h2>
      <p>
        Un outil pour composer une page présentant plusieurs idées de cadeau, en envoyer le lien, et
        savoir laquelle a été retenue. <strong>MyPresentsForYou ne vend rien</strong> : il n&apos;encaisse aucun
        paiement, ne livre rien, et n&apos;intervient à aucun moment entre toi et le marchand chez
        qui tu achèteras. C&apos;est un aide-mémoire partagé, pas une boutique.
      </p>

      <h2>Pas de compte, donc pas de filet</h2>
      <p>
        L&apos;accès à ta carte repose entièrement sur le lien d&apos;administration remis à la
        création. <strong>Nous ne pouvons pas te le renvoyer</strong> : rien ne relie une carte à une
        identité, et c&apos;est précisément ce qui permet de ne rien te demander. Conserve ce lien.
      </p>
      <p>
        Corollaire : qui détient le lien a les droits. Ne le publie pas et ne le transmets qu&apos;à
        des personnes de confiance. Le lien public, lui, est fait pour être partagé — mais son
        adresse est courte et devinable, donc ne mets rien de sensible sur une carte.
      </p>

      <h2>Durée de vie d&apos;une carte</h2>
      <p>
        Une carte sur laquelle personne n&apos;a choisi est supprimée{" "}
        <strong>30 jours après sa création</strong>. Une fois le choix fait, elle se fige sur ce
        choix : elle n&apos;est plus modifiable, et reste consultable jusqu&apos;à ce que tu la
        supprimes.
      </p>

      <h2>Ce que nous te demandons</h2>
      <ul>
        <li>
          Ne rien publier d&apos;illicite, haineux, diffamatoire ou contraire aux droits d&apos;un
          tiers.
        </li>
        <li>
          Ne pas utiliser les cartes pour du démarchage, de l&apos;hameçonnage ou de la
          redirection trompeuse.
        </li>
        <li>
          Ne pas contourner les limites techniques du service, ni l&apos;automatiser pour créer des
          pages en masse.
        </li>
        <li>
          Respecter la personne à qui tu adresses une carte : tu y inscris son prénom sans qu&apos;elle
          l&apos;ait demandé.
        </li>
      </ul>
      <p>
        Une carte qui enfreint ces règles peut être supprimée sans préavis. Pour en signaler une,
        voir la page <Link href="/contact">Contact</Link>.
      </p>

      <h2>Ce sur quoi nous ne nous engageons pas</h2>
      <p>
        Le service est fourni <strong>gratuitement et en l&apos;état</strong>, sans garantie de
        disponibilité ni de conservation. Une interruption, une erreur ou une perte de données reste
        possible. Si une carte compte pour toi, garde ailleurs la liste de ce que tu y as mis.
      </p>
      <p>
        La récupération automatique du titre et de l&apos;image d&apos;un produit dépend entièrement
        du site visé : beaucoup de marchands refusent les requêtes automatisées. Quand elle échoue,
        la saisie manuelle prend le relais — ce n&apos;est pas une panne, c&apos;est le
        fonctionnement prévu.
      </p>

      <h2>Modifications</h2>
      <p>
        Ces conditions peuvent évoluer avec le service. La date de mise à jour en tête de page fait
        foi ; les changements notables seront signalés sur l&apos;accueil.
      </p>

      <p className="prose__date">
        Voir aussi la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </TextPage>
  );
}
