import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrintableCard from "@/components/PrintableCard";
import { findByAdminToken } from "@/lib/db";
import { publicUrlFor } from "@/lib/env";
import { occasionById } from "@/lib/occasions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte à imprimer — Givly",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ token: string }> };

/**
 * La carte à plier et glisser dans une enveloppe : le QR code habillé du thème
 * choisi. Sous le lien d'administration, donc jamais accessible publiquement.
 */
export default async function PrintRoute({ params }: Props) {
  const { token } = await params;
  const page = await findByAdminToken(token);
  if (!page) notFound();

  return (
    <PrintableCard
      url={publicUrlFor(page.slug)}
      to={page.recipient_name}
      intro={page.intro_message.trim() || occasionById(page.theme.occasion).intro}
      title={page.welcome_message}
      signature={page.signature}
      theme={page.theme}
      slug={page.slug}
      backHref={`/admin/${token}`}
    />
  );
}
