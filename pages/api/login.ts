import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import absoluteUrl from "next-absolute-url";
import oauth from "~/lib/oauth";
import { getSession } from "~/lib/session";
import { isUid } from "~/lib/uid";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { uid } = req.query;
  if (!isUid(uid)) return res.status(400).end();

  const session = await getSession(req, res);
  const state = crypto.randomBytes(16).toString("hex");
  session.oauth = { state, uid };
  await session.save();

  const { origin } = absoluteUrl(req);
  const url = oauth.generateAuthUrl({
    state,
    scope: "identify",
    prompt: "consent",
    redirectUri: `${origin}/api/callback`,
  });

  res.redirect(url);
};

export default handler;
