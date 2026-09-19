import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { TenantHighlight } from "@/lib/types/database";

export function Highlights({ items }: { items: TenantHighlight[] }) {
  if (items.length === 0) return null;

  return (
    <section className="px-6 pb-24">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </Card>
        ))}
      </div>
    </section>
  );
}
