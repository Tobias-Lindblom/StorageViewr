"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";
import { AppIcon } from "./app-icon";
export function LogoutButton({
  className = "button-secondary gap-3",
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
        <AppIcon name="logout" />
        <span>{pending ? "Loggar ut…" : "Logga ut"}</span>
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
