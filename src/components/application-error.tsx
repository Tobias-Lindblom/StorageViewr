"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import styles from "./application-error.module.css";

type ApplicationErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export function ApplicationError({ error, retry }: ApplicationErrorProps) {
  useEffect(() => {
    Sentry.withScope((scope) => {
      if (error.digest) scope.setTag("nextjs.digest", error.digest);
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <main className={styles.shell}>
      <section className={styles.card} role="alert">
        <div className={styles.mark} aria-hidden="true">
          !
        </div>
        <h1>Något gick fel</h1>
        <p>
          Sidan kunde inte visas just nu. Försök igen. Om problemet fortsätter
          kan referensen hjälpa oss att hitta felet.
        </p>
        {error.digest ? (
          <p className={styles.reference}>Referens: {error.digest}</p>
        ) : null}
        <button type="button" onClick={retry}>
          Försök igen
        </button>
      </section>
    </main>
  );
}
