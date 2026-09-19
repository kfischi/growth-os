import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5",
        "text-xs font-semibold tracking-wide text-accent uppercase",
        className,
      )}
      {...props}
    />
  );
}
