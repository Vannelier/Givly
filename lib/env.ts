export function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function freePageTtlDays(): number {
  const n = Number.parseInt(process.env.FREE_PAGE_TTL_DAYS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export function publicUrlFor(slug: string): string {
  return `${baseUrl()}/${slug}`;
}

export function adminUrlFor(token: string): string {
  return `${baseUrl()}/admin/${token}`;
}
