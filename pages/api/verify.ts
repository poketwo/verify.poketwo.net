import type { NextApiRequest, NextApiResponse } from "next";
import absoluteUrl from "next-absolute-url";
import env from "~/lib/env";
import { isValidChallenge } from "~/lib/challenge";
import { verifyHCaptcha } from "~/lib/hcaptcha";
import { getSession } from "~/lib/session";
import { isUid } from "~/lib/uid";

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
  const { challenge, discordId } = session;
  delete session.challenge;
  await session.save();

  if (discordId !== uid) {
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
  const verified = await verifyHCaptcha(token, new URL(origin).hostname);
  if (!verified) {
    return redirectWith(res, uid, {
      error: "The captcha couldn't be verified. Please try again.",
    });
  }

  const whResp = await fetch(env.WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid,
      secret: env.WEBHOOK_SECRET,
      solve_ms: solveMs,
    }),
  }).catch(() => null);
  if (!whResp?.ok)
    return redirectWith(res, uid, { error: "Unexpected error." });

  return redirectWith(res, uid, {
    success: "Thanks for verifying! You can now close this page.",
  });
};

export default handler;
