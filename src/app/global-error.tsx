"use client";

import { ApplicationError } from "@/components/application-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sv">
      <body>
        <title>Något gick fel – StorageViewr</title>
        <ApplicationError error={error} retry={reset} />
      </body>
    </html>
  );
}
