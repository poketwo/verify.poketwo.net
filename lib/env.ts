import { bool, cleanEnv, num, str } from "envalid";

export default cleanEnv(process.env, {
  SECRET_KEY: str(),
  DISCORD_CLIENT_ID: str(),
  DISCORD_CLIENT_SECRET: str(),
  WEBHOOK_URL: str(),
  WEBHOOK_SECRET: str(),
  HCAPTCHA_SECRET_KEY: str(),
  NETWORK_COLLECTION_ENABLED: bool({ default: false }),
  NETWORK_HASH_KEY: str({ default: "" }),
  NETWORK_HASH_KEY_VERSION: num({ default: 1 }),
  EDGE_AUTH_SECRET: str({ default: "" }),
});
