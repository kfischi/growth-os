import type { Metadata } from "next";

import { getTenant } from "@/lib/tenant";

import "./globals.css";

/**
 * Metadata is per-tenant, so it is generated from the same cached tenant read
 * the page uses.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { tenant } = await getTenant();
  const { content, client } = tenant;

  return {
    title: {
      default: client.business_name,
      template: `%s · ${client.business_name}`,
    },
    description: content.hero_subheadline,
    openGraph: {
      title: content.hero_headline,
      description: content.hero_subheadline,
      siteName: client.business_name,
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { tenant } = await getTenant();
  const { locale, direction } = tenant.content;

  return (
    <html lang={locale} dir={direction}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
