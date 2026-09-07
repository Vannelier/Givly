import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminView, { type AdminSnapshot } from "@/components/AdminView";
import { findByAdminToken } from "@/lib/db";
import { publicUrlFor } from "@/lib/env";
import { isExpired, isLocked, isSealed } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration — Givly",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ token: string }> };

export default async function AdminRoute({ params }: Props) {
  const { token } = await params;

  // Un token invalide donne un 404 identique à celui d'une page inexistante :
  // rien ne doit laisser deviner qu'une page existe derrière cette adresse.
  const page = await findByAdminToken(token);
  if (!page) notFound();

  const snapshot: AdminSnapshot = {
    slug: page.slug,
    publicUrl: publicUrlFor(page.slug),
    name: page.name,
    intro_message: page.intro_message,
    signature: page.signature,
    link_title: page.link_title,
    recipient_name: page.recipient_name,
    header_image_url: page.header_image_url,
    reveal_at: page.reveal_at,
    reply_message: page.reply_message,
    sealed: isSealed(page),
    welcome_message: page.welcome_message,
    open_label: page.open_label,
    wait_message: page.wait_message,
    items_title: page.items_title,
    items_message: page.items_message,
    thank_you_message: page.thank_you_message,
    cover_image_url: page.cover_image_url,
    theme: page.theme,
    items: page.items,
    created_at: page.created_at,
    updated_at: page.updated_at,
    expires_at: page.expires_at,
    chosen_item_id: page.chosen_item_id,
    chosen_at: page.chosen_at,
    view_count: page.view_count,
    expired: isExpired(page),
    locked: isLocked(page),
  };

  return <AdminView page={snapshot} token={token} />;
}
