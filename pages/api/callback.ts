import { NextApiRequest, NextApiResponse } from "next";
import env from "~/lib/env";
import crypto from "crypto";
import { getSession } from "~/lib/session";
import absoluteUrl from "next-absolute-url";
import oauth from "~/lib/oauth";

const WEBHOOK_URL = env.WEBHOOK_URL;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { code, state } = req.query;
  const session = await getSession(req, res);
  if (!session.id || !session.uid) return res.status(400).end();

  const idState = crypto.createHash("sha256").update(session.id).digest("hex");
  if (typeof code !== "string" || idState !== state)
    return res.status(400).end();

  const { origin } = absoluteUrl(req);
  const token = await oauth.tokenRequest({
    code,
    grantType: "authorization_code",
    scope: "identify email",
    redirectUri: `${origin}/api/callback`,
  });
  const user = await oauth.getUser(token.access_token);

  if (session.uid != user.id) {
    const params = new URLSearchParams({
      error: `User mismatch! Make sure you're signing in with the right Discord account. Expected ${session.uid}, got ${user.id}.`,
    });
    return res.redirect(`/captcha/${session.uid}?${params}`).end();
  }

  const wh_resp = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      uid: session.uid,
      secret: env.WEBHOOK_SECRET,
    }),
  });

  if (!wh_resp.ok) {
    const params = new URLSearchParams({ error: "Unexpected error." });
    return res.redirect(`/captcha/${session.uid}?${params}`).end();
  }

  const uid = session.uid;
  session.destroy();

  const params = new URLSearchParams({
    success: "Thanks for verifying! You can now close this page.",
  });
  return res.redirect(`/captcha/${uid}?${params}`).end();
};

export default handler;
