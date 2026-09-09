import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { SITE, aRemplir } from "@/lib/site";

const MISE_A_JOUR = "2026-09-07";

export const metadata: Metadata = {
  title: "Politique de confidentialité — MyPresentsForYou",
  description:
    "MyPresentsForYou ne pose aucun cookie, n'utilise aucun traqueur et ne demande aucun compte. Ce qui est stocké, pour combien de temps, et comment tout effacer.",
  alternates: { canonical: "/confidentialite" },
};

export default function Confidentialite() {
  return (
    <TextPage
      titre="Politique de confidentialité"
      chapo="MyPresentsForYou est construit pour avoir le moins de données possible à protéger. Cette page dit exactement lesquelles, et pourquoi elles existent."
      miseAJour={MISE_A_JOUR}
    >
      <h2>Aucun cookie, aucun traqueur</h2>
      <p>
        Le site ne dépose <strong>aucun cookie</strong> et n&apos;utilise{" "}
        <strong>aucun outil de mesure d&apos;audience</strong> — pas de Google Analytics, pas
        d&apos;équivalent. Rien ne suit ta navigation, ni ici ni ailleurs. C&apos;est pour cette
        raison qu&apos;aucune bannière de consentement ne t&apos;est présentée.
      </p>

      <h2>Une seule chose est gardée sur ton appareil</h2>
      <p>
        Pendant que tu composes une carte, le formulaire enregistre ton travail en cours dans le{" "}
        <strong>stockage local de ton navigateur</strong>. C&apos;est ce qui te permet de partir
        chercher l&apos;adresse d&apos;un produit chez un marchand, puis de revenir et de retrouver
        ta carte là où tu l&apos;avais laissée — au téléphone, un onglet mis de côté est souvent
        déchargé par le système.
      </p>
      <p>
        Ce brouillon <strong>ne quitte jamais ton appareil</strong> : il n&apos;est envoyé à aucun
        serveur, pas même au nôtre, et nous n&apos;y avons aucun accès. Il est effacé dès que la
        page est créée, et de toute façon au bout de sept jours. Le bouton « Repartir de zéro », en
        tête du formulaire, le supprime immédiatement ; vider les données de site depuis ton
        navigateur fait la même chose.
      </p>
      <p>
        Les polices de caractères sont servies depuis notre propre domaine, pas depuis Google Fonts :
        afficher une page MyPresentsForYou n&apos;envoie aucune requête à un tiers, et donc pas ton adresse IP.
      </p>

      <h2>Ce qui est enregistré quand tu crées une carte</h2>
      <p>Uniquement ce que tu écris toi-même dans le formulaire :</p>
      <ul>
        <li>les titres, notes et adresses des cadeaux que tu proposes ;</li>
        <li>tes messages, ta signature et le prénom que tu donnes à la personne ;</li>
        <li>les images que tu téléverses ou dont tu colles l&apos;adresse ;</li>
        <li>tes réglages d&apos;apparence — occasion, palette, police.</li>
      </ul>
      <p>
        Il n&apos;y a <strong>ni compte, ni mot de passe, ni adresse e-mail</strong>. Rien ne relie
        une carte à une identité : l&apos;accès repose entièrement sur le lien secret
        d&apos;administration qui t&apos;est remis à la création.
      </p>

      <div className="prose__note">
        <p>
          <strong>Le prénom du receveur est une donnée personnelle — la sienne, pas la tienne.</strong>{" "}
          Tu le saisis pour lui, sans qu&apos;il ait rien demandé. Ne mets sur une carte que ce que
          tu accepterais de lui montrer, et rien de sensible : l&apos;adresse publique d&apos;une
          carte est courte et devinable.
        </p>
      </div>

      <h2>Ce qui est enregistré quand quelqu&apos;un reçoit une carte</h2>
      <p>
        La personne qui ouvre le lien <strong>ne saisit rien</strong> : ni nom, ni adresse, ni
        e-mail. Sont enregistrés le cadeau qu&apos;elle a retenu, la date de ce choix, et — si tu as
        activé l&apos;option — le mot qu&apos;elle a bien voulu laisser. Un compteur de consultations
        est incrémenté, sans rien conserver de qui a consulté.
      </p>

      <h2>Ton adresse IP</h2>
      <p>
        Elle est utilisée pour une seule chose : empêcher qu&apos;un robot crée des milliers de pages
        ou téléverse des milliers d&apos;images. Le compteur correspondant vit{" "}
        <strong>en mémoire vive quelques minutes</strong>, il n&apos;est écrit dans aucune base,
        n&apos;est jamais conservé, et disparaît au redémarrage du serveur.
      </p>
      <p>
        Notre hébergeur, lui, tient ses propres journaux techniques, comme tout serveur web. Ils
        échappent à notre contrôle et relèvent de sa politique de conservation.
      </p>

      <h2>Combien de temps</h2>
      <p>
        Une carte sur laquelle personne n&apos;a choisi est supprimée{" "}
        <strong>30 jours après sa création</strong>. Une carte dont le choix a été fait reste
        disponible pour que tu puisses le consulter, jusqu&apos;à ce que tu la supprimes toi-même
        depuis ton lien d&apos;administration.
      </p>

      <h2>Effacer une carte</h2>
      <p>
        Ouvre ton lien d&apos;administration : le bouton de suppression se trouve en bas de la page.
        La suppression est immédiate et définitive — la carte, ses messages et ses images
        disparaissent, et les deux liens cessent de fonctionner.
      </p>
      <p>
        Si tu as perdu ce lien, écris-nous depuis la page{" "}
        <Link href="/contact">Contact</Link> en indiquant l&apos;adresse publique de la carte.
      </p>

      <h2>À qui les données sont transmises</h2>
      <p>
        <strong>Rien n&apos;est vendu, loué, ni cédé à des tiers à des fins commerciales.</strong>{" "}
        Deux prestataires techniques interviennent : l&apos;hébergeur du site et de la base de
        données, et le service de stockage des images. Ils agissent uniquement sur nos instructions,
        pour faire fonctionner le service. Leur identité figure dans les{" "}
        <Link href="/mentions-legales">mentions légales</Link>.
      </p>
      <p>
        Une précision technique : quand tu colles l&apos;adresse d&apos;une page produit pour en
        récupérer le titre et l&apos;image, <strong>c&apos;est notre serveur qui va la consulter</strong>,
        pas ton navigateur. Le marchand voit passer notre serveur, jamais ton adresse IP.
      </p>

      <h2>Tes droits</h2>
      <p>
        Le règlement européen sur la protection des données te donne un droit d&apos;accès, de
        rectification, d&apos;effacement, de limitation et d&apos;opposition. En pratique, tu exerces
        directement les trois premiers depuis ton lien d&apos;administration, qui permet de tout
        consulter, tout modifier et tout supprimer sans nous écrire.
      </p>
      <p>
        Pour le reste, écris-nous
        {aRemplir(SITE.email) ? (
          <>
            {" "}
            à l&apos;adresse indiquée sur la page <Link href="/contact">Contact</Link>
          </>
        ) : (
          <>
            {" "}
            à <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </>
        )}
        . Une limite qu&apos;il faut connaître : <strong>aucune carte n&apos;est reliée à une
        identité</strong>. Sans l&apos;adresse publique de la carte concernée, il nous est
        matériellement impossible de la retrouver — et donc de donner suite à une demande.
      </p>
      <p>
        Si notre réponse ne te satisfait pas, tu peux saisir l&apos;autorité de protection des
        données de ton pays de résidence.
      </p>
    </TextPage>
  );
}
