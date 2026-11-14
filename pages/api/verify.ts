import type { NextApiRequest, NextApiResponse } from "next";
import absoluteUrl from "next-absolute-url";
import env from "~/lib/env";
import { isValidChallenge } from "~/lib/challenge";
import { verifyHCaptcha } from "~/lib/hcaptcha";
import { getSession, signedInUser } from "~/lib/session";
import { isUid } from "~/lib/uid";
import { networkFingerprint } from "~/lib/network";

const VERIFIED_MESSAGE = "Thanks for verifying! You can now close this page.";
const NETWORK_SUSPENDED_MESSAGE =
  "Thanks for verifying! Your account is still restricted because this network is suspended. Turn off any VPN or proxy, or switch to mobile data, and verify again.";

const redirectWith = (
  res: NextApiResponse,
  uid: string,
  result: { error: string } | { success: string },
) => res.redirect(303, `/captcha/${uid}?${new URLSearchParams(result)}`);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const { "h-captcha-response": token, uid, nonce } = req.body;
  if (typeof token !== "string" || typeof nonce !== "string" || !isUid(uid)) {
    return res.status(400).end();
  }

  const session = await getSession(req, res);
  const { challenge } = session;
  const user = signedInUser(session);
  delete session.challenge;
  await session.save();

  if (user?.id !== uid) {
    return redirectWith(res, uid, {
      error: "Please sign in with Discord first.",
    });
  }
  if (!isValidChallenge(challenge, uid, nonce)) {
    return redirectWith(res, uid, {
      error: "This page expired. Please try again.",
    });
  }

  const solveMs = Date.now() - challenge.issuedAt;
  const { origin } = absoluteUrl(req);
  const remoteip = req.headers["cf-connecting-ip"];
  const result = await verifyHCaptcha(
    token,
    new URL(origin).hostname,
    typeof remoteip === "string" ? remoteip : undefined,
  );
  if (!result.ok) {
    return redirectWith(res, uid, {
      error: `The captcha couldn't be verified (${result.reason}). Please try again.`,
    });
  }

  const network = networkFingerprint(req);
  const whResp = await fetch(env.WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid,
      secret: env.WEBHOOK_SECRET,
      solve_ms: solveMs,
      ...(network && { network }),
    }),
  }).catch(() => null);
  if (!whResp?.ok)
    return redirectWith(res, uid, { error: "Unexpected error." });

  const whResult = await whResp.json().catch(() => null);
  return redirectWith(res, uid, {
    success: whResult?.network_suspended
      ? NETWORK_SUSPENDED_MESSAGE
      : VERIFIED_MESSAGE,
  });
};

export default handler;
