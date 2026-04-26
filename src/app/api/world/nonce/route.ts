import { NextResponse } from "next/server";
import { createNoncePair } from "@/world/nonce";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(createNoncePair());
}
