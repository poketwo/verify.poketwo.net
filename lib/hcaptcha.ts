import env from "./env";

const SITEVERIFY_URL = "https://api.hcaptcha.com/siteverify";

type SiteverifyResponse = {
  success: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export const verifyHCaptcha = async (token: string, hostname: string) => {
  const body = new URLSearchParams({
    secret: env.HCAPTCHA_SECRET_KEY,
    response: token,
  });

  try {
    const resp = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) {
      console.warn("siteverify HTTP", resp.status);
      return false;
    }

    const json = <SiteverifyResponse>await resp.json();
    if (!json.success || json.hostname !== hostname) {
      console.warn("siteverify", {
        success: json.success,
        hostname: json.hostname,
        expected: hostname,
        errors: json["error-codes"],
      });
    }
    return json.success;
  } catch (e) {
    console.warn("siteverify failed", e);
    return false;
  }
};
