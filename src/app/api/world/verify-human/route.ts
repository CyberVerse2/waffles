import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

type Body = {
  level?: "orb" | "secure-document" | "document";
  action?: string;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const level = body.level;
  if (level !== "orb" && level !== "secure-document" && level !== "document") {
    return NextResponse.json({ error: "invalid_level" }, { status: 400 });
  }

  // PROTOTYPE: trust the client-reported level. World wallet sign-in already
  // proves wallet ownership via SIWE, and the level read came from MiniKit.
  // BEFORE production:
  //   1. Re-verify the verification status server-side (call World ID's
  //      personhood/identity API or a signed attestation) instead of trusting
  //      the client.
  //   2. Persist (walletAddress, level, verifiedAt, nullifierHash) in a DB
  //      with a UNIQUE constraint on nullifierHash so one human can't be
  //      tied to two wallets.
  //   3. Update the NextAuth session's JWT so downstream routes can gate
  //      tournament entry without re-checking each request.
  return NextResponse.json({
    verified: true,
    level,
    address: session.user.address,
    verifiedAt: new Date().toISOString(),
  });
}
