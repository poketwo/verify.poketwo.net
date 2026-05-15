import { cleanEnv, str } from "envalid";

export default cleanEnv(process.env, {
  SECRET_KEY: str(),
  DISCORD_CLIENT_ID: str(),
  DISCORD_CLIENT_SECRET: str(),
  WEBHOOK_URL: str(),
  WEBHOOK_SECRET: str(),
  HCAPTCHA_SECRET_KEY: str(),
});
