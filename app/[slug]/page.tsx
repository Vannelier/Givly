import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GiftView from "@/components/GiftView";
import { findBySlug, incrementViewCount } from "@/lib/db";
import { baseUrl, publicUrlFor } from "@/lib/env";
import { RESERVED_SLUGS } from "@/lib/slug";
import { isExpired, isLocked, toPublicPage } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const OG_DESCRIPTION = "Choisis ton cadeau.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return { title: "Page introuvable" };
  const page = await findBySlug(slug).catch(() => null);
  if (!page) return { title: "Page introuvable" };

  const title = page.welcome_message || "Un cadeau pour toi";
  const image = page.cover_image_url ?? page.items.find((i) => i.image_url)?.image_url ?? null;
  const url = publicUrlFor(page.slug);

  return {
    metadataBase: new URL(baseUrl()),
    title,
    description: OG_DESCRIPTION,
    openGraph: {
      type: "website",
      title,
      description: OG_DESCRIPTION,
      url,
      siteName: "Givly",
      locale: "fr_BE",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: OG_DESCRIPTION,
      images: image ? [image] : undefined,
    },
    robots: { index: false, follow: false },
  };
}

export default async function GiftPageRoute({ params }: Props) {
  const { slug } = await params;
  // /favicon.ico, /robots.txt et compagnie retombent ici : 404 sans toucher la base.
  if (RESERVED_SLUGS.has(slug)) notFound();

  const page = await findBySlug(slug);
  if (!page) notFound();

  if (isExpired(page)) {
    return (
      <div className="shell shell--flush">
        <div className="state">
          <h1>Ce cadeau n&apos;est plus disponible</h1>
          <p>Le lien a expiré. Demande à la personne qui te l&apos;a envoyé d&apos;en créer un nouveau.</p>
        </div>
      </div>
    );
  }

  // Analytics minimal : on ne compte que les consultations de pages actives,
  // pour que le compteur reflète les visites réellement en attente d'un choix.
  if (!isLocked(page)) {
    await incrementViewCount(page.id).catch(() => undefined);
  }

  return <GiftView page={toPublicPage(page)} />;
}
