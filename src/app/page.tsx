import { Hero } from "@/components/sections/hero";
import { Highlights } from "@/components/sections/highlights";
import { SetupNotice } from "@/components/sections/setup-notice";
import { SiteFooter } from "@/components/sections/site-footer";
import { getTenant } from "@/lib/tenant";

/**
 * The homepage is resolved from the request's Host header, so it can never be
 * statically prerendered into a single shared shell.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const resolution = await getTenant();
  const { tenant } = resolution;

  return (
    <main className="flex min-h-dvh flex-col">
      <SetupNotice resolution={resolution} />
      <Hero tenant={tenant} />
      <Highlights items={tenant.content.highlights} />
      <div className="mt-auto">
        <SiteFooter tenant={tenant} />
      </div>
    </main>
  );
}
