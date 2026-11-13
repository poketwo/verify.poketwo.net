import env from "./env";
import publicEnv from "./public-env";

const SITEVERIFY_URL = "https://api.hcaptcha.com/siteverify";

type SiteverifyResponse = {
  success: boolean;
  hostname?: string;
};

export const verifyHCaptcha = async (
  token: string,
  hostname: string,
  remoteip?: string,
) => {
  const body = new URLSearchParams({
    secret: env.HCAPTCHA_SECRET_KEY,
    response: token,
    sitekey: publicEnv.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
  });
  if (remoteip) body.set("remoteip", remoteip);

  try {
    const resp = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) return false;

    const json = <SiteverifyResponse>await resp.json();
    return json.success && json.hostname === hostname;
  } catch {
    return false;
  }
};
