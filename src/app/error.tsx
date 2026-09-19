"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Last-resort boundary. The tenant loader already degrades to fallback copy,
 * so reaching this means something unexpected broke during render.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[render] unhandled error", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-muted">
        We could not load this page. The team has been notified — please try
        again in a moment.
      </p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-muted">
          reference: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
