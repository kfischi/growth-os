import { Badge } from "@/components/ui/badge";
import { safeHref } from "@/lib/utils";
import type { TenantPromo } from "@/lib/types/database";

/**
 * The active promo strip. Renders nothing when no promo is configured — an
 * empty banner is worse than no banner.
 */
export function PromoBanner({ promo }: { promo: TenantPromo | null }) {
  if (!promo) return null;

  const href = safeHref(promo.href);

  const body = (
    <>
      {promo.label ? <Badge>{promo.label}</Badge> : null}
      <span className="text-sm text-muted">{promo.text}</span>
    </>
  );

  const shell =
    "inline-flex items-center gap-3 rounded-full border border-line bg-surface/70 px-4 py-2 backdrop-blur";

  return (
    <div className="animate-rise flex justify-center">
      {href ? (
        <a
          href={href}
          className={`${shell} transition-colors duration-200 hover:border-ink/25`}
        >
          {body}
          <span aria-hidden className="text-muted rtl:rotate-180">
            &rarr;
          </span>
        </a>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </div>
  );
}
