import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { getSignedNonce } from "./world/nonce";

declare module "next-auth" {
  interface Session {
    user: {
      address: string;
    } & DefaultSession["user"];
  }
}

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "World Wallet",
      credentials: {
        nonce: { label: "Nonce", type: "text" },
        signedNonce: { label: "Signed Nonce", type: "text" },
        payloadJson: { label: "Wallet Auth Payload", type: "text" },
      },
      async authorize(credentials) {
        const nonce = String(credentials?.nonce ?? "");
        const signedNonce = String(credentials?.signedNonce ?? "");
        const payloadJson = String(credentials?.payloadJson ?? "");

        if (!nonce || !signedNonce || !payloadJson) return null;
        if (signedNonce !== getSignedNonce(nonce)) return null;

        const payload = JSON.parse(payloadJson) as Parameters<typeof verifySiweMessage>[0];
        const verification = await verifySiweMessage(payload, nonce);
        const address = verification.siweMessageData.address;

        if (!verification.isValid || !address) return null;

        return {
          id: address,
          address,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.address = (user as typeof user & { address: string }).address;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.address = String(token.address ?? "");
      return session;
    },
  },
});
