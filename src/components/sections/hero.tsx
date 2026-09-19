import { Button } from "@/components/ui/button";
import { PromoBanner } from "@/components/sections/promo-banner";
import { safeHref } from "@/lib/utils";
import type { Tenant } from "@/lib/types/database";

export function Hero({ tenant }: { tenant: Tenant }) {
  const { content } = tenant;
  const ctaHref = safeHref(content.cta_href);

  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
      {/* A single soft light source behind the headline — no gradients, no noise. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-accent-soft)_0%,transparent_70%)]"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <PromoBanner promo={content.active_promo} />

        <h1 className="animate-rise mt-9 text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-6xl">
          {content.hero_headline}
        </h1>

        <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted sm:text-xl">
          {content.hero_subheadline}
        </p>

        <div className="animate-rise mt-10 flex flex-col items-center gap-3 sm:flex-row">
          {ctaHref ? (
            <Button asChild size="lg">
              <a href={ctaHref}>{content.cta_text}</a>
            </Button>
          ) : (
            <Button size="lg" disabled>
              {content.cta_text}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
