import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-muted">
        The page you are looking for does not exist, or has moved.
      </p>
      <Button asChild variant="secondary" className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
