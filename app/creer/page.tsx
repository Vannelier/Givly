import type { Metadata } from "next";
import CreateFlow from "@/components/CreateFlow";
import { baseUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Composer une page-cadeau — Givly",
  description: "Rassemble deux à dix idées, envoie un lien, découvre ce qui a été choisi.",
};

export default function CreatePage() {
  const label = baseUrl().replace(/^https?:\/\//, "");
  return <CreateFlow baseUrlLabel={label} />;
}
