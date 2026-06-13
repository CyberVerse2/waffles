"use client";

import { useState, type ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import { ASSETS, PixelImg } from "./shared";
import { useWorldSignIn } from "./onboarding/use-world-auth";

export function WorldAuthGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { signIn: signInWithWorld, isSigningIn, error, isInstalled } = useWorldSignIn();
  const [isBypassed, setIsBypassed] = useState(false);

  if (status === "loading") {
    return <WorldAuthPanel title="Loading Waffles..." />;
  }

  if (session?.user?.address || isBypassed) {
    return (
      <>
        <div className="world-auth-pill world-auth-pill-paper">
          <span>{session?.user?.address ? compactAddress(session.user.address) : "Prototype"}</span>
          {session?.user?.address ? (
            <button type="button" onClick={() => void signOut({ redirect: false })}>
              Sign out
            </button>
          ) : null}
        </div>
        {children}
      </>
    );
  }

  return (
    <WorldAuthPanel
      title="Waffles"
      isInstalled={isInstalled}
      error={error}
      isSigningIn={isSigningIn}
      onSignIn={() => void signInWithWorld()}
      onBypass={() => setIsBypassed(true)}
    />
  );
}

function WorldAuthPanel({
  title,
  isInstalled,
  error,
  isSigningIn,
  onSignIn,
  onBypass,
}: {
  title: string;
  isInstalled?: boolean;
  error?: string | null;
  isSigningIn?: boolean;
  onSignIn?: () => void;
  onBypass?: () => void;
}) {
  return (
    <div className="world-auth-screen">
      <div className="world-auth-shell">
        <PixelImg src={ASSETS.wally} size={96} alt="" />
        <h1>{title}</h1>
        <p>Play real-time trivia with your World wallet.</p>
        {onSignIn ? (
          <div className="world-auth-actions">
            <button type="button" className="world-auth-primary" onClick={onSignIn} disabled={isSigningIn}>
              {isSigningIn ? "Signing in..." : "Sign in with World"}
            </button>
            {isInstalled === false ? (
              <button type="button" className="world-auth-secondary" onClick={onBypass}>
                Continue prototype
              </button>
            ) : null}
          </div>
        ) : null}
        {isInstalled === false ? <p className="world-auth-note">World wallet sign-in works inside World App.</p> : null}
        {error ? <p className="world-auth-error">{error}</p> : null}
      </div>
    </div>
  );
}

function compactAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
