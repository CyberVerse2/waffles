"use client";

import { SessionProvider } from "next-auth/react";
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MiniKitProvider props={{ appId: process.env.NEXT_PUBLIC_WORLD_APP_ID }}>
        {children}
      </MiniKitProvider>
    </SessionProvider>
  );
}
