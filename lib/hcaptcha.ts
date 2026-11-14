import env from "./env";
import publicEnv from "./public-env";

const SITEVERIFY_URL = "https://api.hcaptcha.com/siteverify";

type SiteverifyResponse = {
  success: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export type HCaptchaResult = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): HCaptchaResult => {
  console.warn("siteverify rejected:", reason);
  return { ok: false, reason };
};

// hCaptcha reports the sitekey's configured domain (e.g. poketwo.net), not the
// exact subdomain the widget ran on.
const isSameSite = (solvedOn: string, hostname: string) =>
  solvedOn === hostname ||
  (solvedOn.includes(".") && hostname.endsWith(`.${solvedOn}`));

export const verifyHCaptcha = async (
  token: string,
  hostname: string,
  remoteip?: string,
): Promise<HCaptchaResult> => {
  const body = new URLSearchParams({
    secret: env.HCAPTCHA_SECRET_KEY,
    response: token,
    sitekey: publicEnv.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
  });
  if (remoteip) body.set("remoteip", remoteip);

  let resp: Response;
  try {
    resp = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return fail("hCaptcha unreachable");
  }
  if (!resp.ok) return fail(`hCaptcha HTTP ${resp.status}`);

  let json: SiteverifyResponse;
  try {
    json = await resp.json();
  } catch {
    return fail("hCaptcha sent invalid JSON");
  }
  if (!json.success) {
    return fail(json["error-codes"]?.join(", ") || "unknown error");
  }
  if (!json.hostname || !isSameSite(json.hostname, hostname)) {
    return fail(`solved on ${json.hostname ?? "no hostname"}, not ${hostname}`);
  }
  return { ok: true };
};
