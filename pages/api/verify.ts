import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import oauth from "~/lib/oauth";
import env from "~/lib/env";
import { getSession } from "~/lib/session";
import absoluteUrl from "next-absolute-url";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  const { "h-captcha-response": token, uid } =
    req.method === "GET"
      ? req.query
      : (req.body as Partial<
          Record<"h-captcha-response" | "uid", string | string[]>
        >);

  if (typeof token !== "string") {
    res.status(400).end();
    return;
  }
  if (typeof uid !== "string" || !/^\d+$/.test(uid)) {
    res.status(400).end();
    return;
  }

  const body = new URLSearchParams({
    secret: env.HCAPTCHA_SECRET_KEY,
    response: token,
  });
  const resp = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = <{ success: boolean }>await resp.json();
  if (!json.success) return res.status(400).end();

  const session = await getSession(req, res);
  session.id = crypto.randomBytes(16).toString("hex");
  session.uid = uid;
  await session.save();

  const state = crypto.createHash("sha256").update(session.id).digest("hex");
  const { origin } = absoluteUrl(req);
  const url = oauth.generateAuthUrl({
    state,
    scope: "identify",
    redirectUri: `${origin}/api/callback`,
  });

  res.setHeader("Referrer-Policy", "no-referrer");
  res.redirect(url);
};

export default handler;
