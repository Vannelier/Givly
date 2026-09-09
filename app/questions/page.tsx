import type { Metadata } from "next";
import Link from "next/link";
import TextPage from "@/components/TextPage";
import { LIMITS } from "@/lib/limits";

export const metadata: Metadata = {
  title: "Questions fréquentes — MyPresentsForYou",
  description:
    "Offrir en laissant choisir : comment ça marche, combien ça coûte, ce que voit la personne qui reçoit, et que faire si une image ne se récupère pas.",
  alternates: { canonical: "/questions" },
};

/**
 * Les questions et leurs réponses, en données plutôt qu'en JSX.
 *
 * Le texte affiché et le balisage `FAQPage` sont produits par la même source :
 * Google exige que les deux coïncident, et deux listes tenues en parallèle
 * auraient divergé à la première correction de formulation.
 *
 * Les réponses portent volontairement les mots que les gens tapent — « laisser
 * choisir son cadeau », « sans inscription » — plutôt que le vocabulaire interne
 * du projet. Une page ne se trouve pas avec les mots de celui qui l'écrit.
 */
const QUESTIONS: { q: string; r: string[] }[] = [
  {
    q: "Comment offrir un cadeau en laissant la personne choisir ?",
    r: [
      "Tu rassembles quelques idées sur une petite page — jusqu'à dix — puis tu envoies le lien. La personne ouvre la page, regarde les propositions, et confirme celle qui lui fait le plus envie. Tu retrouves son choix sur ton lien privé, et tu achètes le cadeau toi-même.",
      "L'intérêt : elle reçoit quelque chose qui lui plaît vraiment, sans que tu aies eu à lui demander ce qu'elle voulait — donc sans gâcher la surprise.",
    ],
  },
  {
    q: "MyPresentsForYou est-il gratuit ?",
    r: [
      "Oui, entièrement. Aucun paiement ne transite par le site, et il n'y a rien à payer pour créer une carte. Tu achètes le cadeau retenu chez le marchand de ton choix, exactement comme tu l'aurais fait sans MyPresentsForYou.",
    ],
  },
  {
    q: "Faut-il créer un compte ?",
    r: [
      "Non. Ni compte, ni mot de passe, ni adresse e-mail — ni pour toi, ni pour la personne qui reçoit la carte.",
      "À la création, tu reçois deux liens : un lien public à envoyer, et un lien privé à garder. Ce second lien est le seul moyen de revenir sur ta carte et d'y voir le choix. Conserve-le : comme rien ne relie une carte à une identité, il ne peut pas être renvoyé.",
    ],
  },
  {
    q: "Que voit la personne qui reçoit la carte ?",
    r: [
      "Une page à son nom, avec ton message et tes propositions. Elle choisit et confirme, c'est tout : elle n'a ni compte à créer, ni formulaire à remplir, et ne saisit ni nom, ni adresse, ni e-mail.",
      "Les prix ne sont jamais affichés. Elle voit ce que tu proposes, pas ce que ça coûte.",
    ],
  },
  {
    q: "Combien d'idées puis-je proposer ?",
    r: [
      `De une à ${LIMITS.itemsMax}. Avec une seule proposition, la carte cesse d'être un choix pour devenir une annonce : la personne confirme simplement qu'elle l'a reçue, et tu sais quand elle l'a ouverte.`,
    ],
  },
  {
    q: "Combien de temps la page reste-t-elle en ligne ?",
    r: [
      "Trente jours si personne ne choisit — passé ce délai, elle est supprimée automatiquement. Une fois le choix fait, la carte se fige sur ce choix et reste consultable jusqu'à ce que tu la supprimes toi-même.",
    ],
  },
  {
    q: "Puis-je modifier la carte après l'avoir envoyée ?",
    r: [
      "Oui, tant que personne n'a confirmé son choix. Tu peux changer les messages, les cadeaux, l'apparence — et les liens déjà envoyés continuent de fonctionner, car ils ne changent jamais.",
      "Dès qu'un choix est confirmé, la carte se verrouille : elle ne serait plus honnête si elle pouvait changer après coup.",
    ],
  },
  {
    q: "Comment envoyer la carte ?",
    r: [
      "Par WhatsApp, SMS, e-mail, ou n'importe quel moyen qui accepte un lien. Collé dans une messagerie, le lien s'affiche avec ton message et une image plutôt qu'avec une adresse nue.",
      "Il existe aussi un QR code, à imprimer et glisser dans une vraie carte en papier : la personne le scanne et la page s'ouvre. Une carte A6 prête à imprimer est fournie, aux couleurs de ton thème.",
    ],
  },
  {
    q: "L'image du produit n'est pas récupérée, est-ce un bug ?",
    r: [
      "Non. Quand tu colles l'adresse d'une page produit, le titre et l'image sont récupérés automatiquement — mais beaucoup de marchands, Amazon et les réseaux sociaux en tête, refusent les requêtes automatisées. C'est prévu, pas cassé.",
      "Dans ce cas tu remplis à la main : une photo depuis ton téléphone, une image copiée-collée, ou une adresse d'image. La carte est identique au final.",
    ],
  },
  {
    q: "En quoi est-ce différent d'une liste de souhaits ?",
    r: [
      "Sur une liste de souhaits, c'est elle qui écrit ce qu'elle veut, et toi qui y pioches. Ici, c'est toi qui proposes et elle qui choisit.",
      "Et contrairement à une liste de mariage ou une cagnotte, rien n'est encaissé ici : MyPresentsForYou ne touche jamais à l'argent.",
    ],
  },
  {
    q: "Mes données sont-elles collectées ?",
    r: [
      "Le site ne pose aucun cookie, n'utilise aucun outil de mesure d'audience, et ne demande aucun compte. Seul est enregistré ce que tu écris toi-même dans le formulaire.",
      "Le détail complet est sur la page Politique de confidentialité.",
    ],
  },
];

export default function Questions() {
  /*
   * Balisage `FAQPage`. À dire franchement : depuis 2023, Google réserve les
   * résultats enrichis « questions » aux sites gouvernementaux et de santé — ce
   * balisage n'affichera donc pas d'accordéon dans les résultats. Il reste utile
   * pour la compréhension de la page par les moteurs, et ne coûte rien. Ce qui
   * fera venir du monde ici, ce sont les réponses elles-mêmes, pas ce script.
   */
  const donneesStructurees = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map(({ q, r }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: r.join(" ") },
    })),
  };

  return (
    <TextPage
      titre="Questions fréquentes"
      chapo="Offrir en laissant choisir : comment ça marche, ce que ça coûte, et ce qui se passe quand la récupération automatique échoue."
    >
      <script
        type="application/ld+json"
        // Contenu que nous produisons nous-mêmes à partir du tableau ci-dessus,
        // jamais une saisie : rien d'extérieur n'entre dans cette chaîne.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
      />

      <div className="faq">
        {QUESTIONS.map(({ q, r }, i) => (
          <details className="faq__item" key={q} open={i === 0}>
            <summary>
              <h2 style={{ display: "inline", font: "inherit", margin: 0 }}>{q}</h2>
            </summary>
            <div>
              {r.map((paragraphe) => (
                <p key={paragraphe}>{paragraphe}</p>
              ))}
            </div>
          </details>
        ))}
      </div>

      <h2>Une autre question ?</h2>
      <p>
        Écris-nous depuis la page <Link href="/contact">Contact</Link>. Pour tout ce qui touche aux
        données, la <Link href="/confidentialite">politique de confidentialité</Link> entre dans le
        détail.
      </p>
    </TextPage>
  );
}
