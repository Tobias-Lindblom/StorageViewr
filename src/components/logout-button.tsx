"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";
export function LogoutButton({
  className = "button-secondary",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className={className}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            await clientApi("/api/auth/logout", "POST");
            router.push("/login");
            router.refresh();
          } catch {
            setError("Utloggningen misslyckades. Försök igen.");
            setPending(false);
          }
        }}
      >
        Logga ut
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
