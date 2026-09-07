import type { Metadata } from "next";
import CreateFlow from "@/components/CreateFlow";
import { baseUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Créer une page-cadeau gratuite — Givly",
  description:
    "Compose ta page en deux étapes : tes idées de cadeau, puis la présentation. Sans compte, sans paiement, en quelques minutes.",
  alternates: { canonical: "/creer" },
};

export default function CreatePage() {
  const label = baseUrl().replace(/^https?:\/\//, "");
  return <CreateFlow baseUrlLabel={label} />;
}
