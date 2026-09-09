import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { SITE, aRemplir } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales — MyPresentsForYou",
  description: "Éditeur, hébergeur et contact du site MyPresentsForYou.",
  alternates: { canonical: "/mentions-legales" },
  // Une page de mentions n'apporte rien dans un index de recherche, mais elle
  // doit rester atteignable : `follow` laisse passer le lien vers le reste.
  robots: { index: false, follow: true },
};

/** Affiche la valeur, ou signale franchement qu'elle manque. */
function Valeur({ children }: { children: string }) {
  if (aRemplir(children)) {
    return <span className="prose__manquant">À compléter par l&apos;éditeur</span>;
  }
  return <>{children}</>;
}

export default function MentionsLegales() {
  const societe = SITE.editeur.statut === "societe";

  return (
    <TextPage
      titre="Mentions légales"
      chapo="Qui édite ce site, qui l'héberge, et comment nous joindre."
    >
      <h2>Éditeur du site</h2>
      <p>
        {societe ? "Raison sociale" : "Responsable de la publication"} :{" "}
        <strong>
          <Valeur>{SITE.editeur.nom}</Valeur>
        </strong>
        <br />
        Adresse : <Valeur>{SITE.editeur.adresse}</Valeur>
        <br />
        Contact :{" "}
        {aRemplir(SITE.email) ? (
          <Valeur>{SITE.email}</Valeur>
        ) : (
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        )}
        {societe && (
          <>
            <br />
            Numéro d&apos;entreprise : <Valeur>{SITE.editeur.numeroEntreprise}</Valeur>
            {SITE.editeur.tva && (
              <>
                <br />
                Numéro de TVA : {SITE.editeur.tva}
              </>
            )}
          </>
        )}
      </p>

      <h2>Hébergeur</h2>
      <p>
        <strong>
          <Valeur>{SITE.hebergeur.nom}</Valeur>
        </strong>
        <br />
        <Valeur>{SITE.hebergeur.adresse}</Valeur>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom MyPresentsForYou, l&apos;interface du site et son code sont la propriété de leur auteur. En
        revanche, <strong>le contenu des cartes appartient à celui qui les compose</strong> : textes,
        images et choix restent les siens, et nous n&apos;en revendiquons aucun droit.
      </p>
      <p>
        Les images de produits récupérées depuis des sites marchands appartiennent à leurs
        propriétaires respectifs. Elles sont recopiées pour la seule durée de vie de la carte, afin
        qu&apos;elle ne se casse pas si le marchand modifie son site.
      </p>

      <h2>Responsabilité</h2>
      <p>
        MyPresentsForYou ne vend rien et n&apos;encaisse aucun paiement. Les cadeaux proposés sur une carte
        renvoient vers des sites tiers, sur lesquels nous n&apos;avons aucun contrôle : leur contenu,
        leurs prix et leur disponibilité n&apos;engagent qu&apos;eux.
      </p>

      <h2>Signaler un contenu</h2>
      <p>
        Les cartes sont créées librement et sans compte. Si l&apos;une d&apos;elles présente un
        contenu illicite, écris-nous depuis la page <Link href="/contact">Contact</Link> en
        indiquant son adresse — nous la supprimerons.
      </p>

      <p className="prose__date">
        Voir aussi la <Link href="/confidentialite">politique de confidentialité</Link> et les{" "}
        <Link href="/conditions">conditions d&apos;utilisation</Link>.
      </p>
    </TextPage>
  );
}
