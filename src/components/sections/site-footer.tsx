import type { Tenant } from "@/lib/types/database";

export function SiteFooter({ tenant }: { tenant: Tenant }) {
  const version = tenant.config?.version;

  return (
    <footer className="border-t border-line px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm text-muted sm:flex-row">
        <p>
          &copy; {new Date().getFullYear()} {tenant.client.business_name}
        </p>
        {version ? (
          <p className="font-mono text-xs">config v{version}</p>
        ) : null}
      </div>
    </footer>
  );
}
