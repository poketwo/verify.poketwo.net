import crypto from "crypto";

// Shortest time a person can plausibly take from opening the page to pressing Verify.
export const MIN_SOLVE_MS = 2_000;
// Longer than this and the page has to be reloaded for a fresh challenge.
export const MAX_CHALLENGE_AGE_MS = 15 * 60_000;

export type Challenge = {
  nonce: string;
  uid: string;
  issuedAt: number;
};

export const createChallenge = (uid: string): Challenge => ({
  nonce: crypto.randomBytes(16).toString("hex"),
  uid,
  issuedAt: Date.now(),
});

const nonceMatches = (expected: string, given: string) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const isValidChallenge = (
  challenge: Challenge | undefined,
  uid: string,
  nonce: string,
): challenge is Challenge => {
  if (!challenge || challenge.uid !== uid) return false;
  if (!nonceMatches(challenge.nonce, nonce)) return false;
  const age = Date.now() - challenge.issuedAt;
  return age >= MIN_SOLVE_MS && age <= MAX_CHALLENGE_AGE_MS;
};
