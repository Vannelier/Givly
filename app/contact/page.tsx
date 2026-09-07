import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { SITE, aRemplir } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Givly",
  description:
    "Une question, un bug, une carte à signaler ou un lien d'administration perdu : comment nous joindre.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  const sansAdresse = aRemplir(SITE.email);

  return (
    <TextPage
      titre="Contact"
      chapo="Givly est un petit projet. Les réponses ne sont pas instantanées, mais elles arrivent."
    >
      <h2>Nous écrire</h2>
      {sansAdresse ? (
        <div className="prose__note">
          <p>
            <span className="prose__manquant">Adresse de contact à renseigner</span> dans{" "}
            <code>lib/site.ts</code>. Tant qu&apos;elle est vide, cette page ne peut pas en inventer
            une.
          </p>
        </div>
      ) : (
        <p>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      )}

      <p>
        Il n&apos;y a pas de formulaire sur cette page, et c&apos;est volontaire : un formulaire
        supposerait d&apos;enregistrer ce que tu écris et de poser un cookie anti-robot. Le reste du
        site n&apos;en pose aucun, autant rester cohérent.
      </p>

      <h2>Ce qui aide à te répondre vite</h2>

      <h3>Tu as perdu ton lien d&apos;administration</h3>
      <p>
        Indique <strong>l&apos;adresse publique de la carte</strong> — celle que tu as envoyée. Sans
        elle, nous ne pouvons rien retrouver : aucune carte n&apos;est reliée à une identité, il
        n&apos;y a ni compte ni e-mail à interroger. C&apos;est le revers assumé de ne rien te
        demander à l&apos;inscription.
      </p>

      <h3>Tu veux faire supprimer une carte</h3>
      <p>
        Le plus rapide reste ton lien d&apos;administration : le bouton de suppression est en bas de
        la page, et l&apos;effacement est immédiat. Écris-nous seulement si tu as perdu ce lien, en
        joignant l&apos;adresse publique de la carte.
      </p>

      <h3>Tu signales un contenu</h3>
      <p>
        Donne l&apos;adresse de la carte et ce qui pose problème. Les cartes sont créées librement et
        sans compte : le signalement est le seul moyen que nous ayons d&apos;en avoir connaissance.
      </p>

      <h3>Tu rapportes un bug</h3>
      <p>
        Ce que tu faisais, ce que tu attendais, ce qui s&apos;est passé — plus ton navigateur et si
        c&apos;était au téléphone ou à l&apos;ordinateur. Une capture d&apos;écran vaut souvent trois
        paragraphes.
      </p>

      <h2>Avant d&apos;écrire</h2>
      <p>
        Beaucoup de questions ont déjà leur réponse sur la page{" "}
        <Link href="/questions">Questions fréquentes</Link> — notamment sur la récupération
        automatique des images, qui échoue chez certains marchands sans que ce soit une panne.
      </p>
    </TextPage>
  );
}
