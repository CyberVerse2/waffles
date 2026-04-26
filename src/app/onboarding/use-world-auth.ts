"use client";

import { useCallback, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKit } from "@worldcoin/minikit-js/minikit-provider";
import { signIn } from "next-auth/react";

type NonceResponse = { nonce: string; signedNonce: string };

export type WorldSignIn = ReturnType<typeof useWorldSignIn>;

export function useWorldSignIn() {
  const { isInstalled } = useMiniKit();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const run = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    setError(null);
    setIsSigningIn(true);

    try {
      const nonceRes = await fetch("/api/world/nonce", { cache: "no-store" });
      if (!nonceRes.ok) throw new Error("Could not create a wallet auth nonce.");
      const { nonce, signedNonce } = (await nonceRes.json()) as NonceResponse;

      const walletResult = await MiniKit.walletAuth({
        nonce,
        statement: "Sign in to Waffles",
        expirationTime: new Date(Date.now() + 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 60 * 1000),
      });

      if (walletResult.executedWith === "fallback") {
        throw new Error("Open Waffles inside World App to sign in with your World wallet.");
      }

      const authResult = await signIn("credentials", {
        redirect: false,
        nonce,
        signedNonce,
        payloadJson: JSON.stringify(walletResult.data),
      });

      if (authResult?.error) throw new Error("World wallet authentication was rejected.");
      return { ok: true };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "World wallet authentication failed.";
      setError(reason);
      return { ok: false, reason };
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { signIn: run, isSigningIn, error, isInstalled, clearError };
}
