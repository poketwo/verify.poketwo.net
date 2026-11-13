import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "~/lib/session";
import absoluteUrl from "next-absolute-url";
import oauth from "~/lib/oauth";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { code, state } = req.query;
  const session = await getSession(req, res);
  const pending = session.oauth;
  if (!pending || typeof code !== "string" || state !== pending.state)
    return res.status(400).end();

  delete session.oauth;
  delete session.discordId;

  const { origin } = absoluteUrl(req);
  const token = await oauth.tokenRequest({
    code,
    grantType: "authorization_code",
    scope: "identify",
    redirectUri: `${origin}/api/callback`,
  });
  const user = await oauth.getUser(token.access_token);

  if (user.id !== pending.uid) {
    await session.save();
    const params = new URLSearchParams({
      error: `User mismatch! Make sure you're signing in with the right Discord account. Expected ${pending.uid}, got ${user.id}.`,
    });
    return res.redirect(`/captcha/${pending.uid}?${params}`);
  }

  session.discordId = user.id;
  await session.save();

  return res.redirect(`/captcha/${pending.uid}`);
};

export default handler;
