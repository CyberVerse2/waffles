import crypto from "node:crypto";

const getHmacSecret = () => {
  const secret = process.env.HMAC_SECRET_KEY;
  if (!secret) {
    throw new Error("HMAC_SECRET_KEY is required for World wallet authentication.");
  }
  return secret;
};

export const getSignedNonce = (nonce: string) => {
  const hmac = crypto.createHmac("sha256", getHmacSecret());
  hmac.update(nonce);
  return hmac.digest("hex");
};

export const createNoncePair = () => {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  return {
    nonce,
    signedNonce: getSignedNonce(nonce),
  };
};
