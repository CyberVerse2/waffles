"use client";

import { useCallback, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";

export type VerifyLevel = "orb" | "secure-document" | "document";

export type VerifyResult =
  | { ok: true; level: VerifyLevel }
  | { ok: false; reason: string; needsWorldApp: boolean };

// MiniKit v2 surfaces World ID verification as a read-only field on
// `MiniKit.user.verificationStatus`. Users verify themselves once inside
// World App; mini-apps then read that status. The "verify" step here is
// therefore a *check* (with refresh + retry) rather than an interactive
// proof flow. Action ID is recorded server-side for audit.
export const VERIFY_ACTION_ID = "waffles-verify-human-v1";

export function useVerifyHuman() {
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (): Promise<VerifyResult> => {
    setError(null);
    setIsChecking(true);
    try {
      const address = session?.user?.address;
      // Refresh the cached user payload so verifications completed mid-session land here.
      if (address) {
        try {
          await MiniKit.getUserInfo(address);
        } catch {
          // Refresh is best-effort; fall back to whatever we already have cached.
        }
      }

      const status = MiniKit.user?.verificationStatus;
      if (!status) {
        const reason = "Open Waffles inside World App so we can read your verification.";
        setError(reason);
        return { ok: false, reason, needsWorldApp: true };
      }

      const level: VerifyLevel | null = status.isOrbVerified
        ? "orb"
        : status.isSecureDocumentVerified
          ? "secure-document"
          : status.isDocumentVerified
            ? "document"
            : null;

      if (!level) {
        const reason = "You haven't verified yet. Verify in World App, then come back.";
        setError(reason);
        return { ok: false, reason, needsWorldApp: false };
      }

      // Persist on the server (stub for now; see route handler).
      try {
        await fetch("/api/world/verify-human", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, action: VERIFY_ACTION_ID }),
        });
      } catch {
        // Persistence failures don't block the user — local cache still applies.
      }

      return { ok: true, level };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Verification check failed.";
      setError(reason);
      return { ok: false, reason, needsWorldApp: false };
    } finally {
      setIsChecking(false);
    }
  }, [session]);

  return { check, isChecking, error };
}
