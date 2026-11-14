import { getIronSession, IronSession } from "iron-session";
import { IncomingMessage, ServerResponse } from "http";
import { Challenge } from "./challenge";
import env from "./env";

export const SIGN_IN_TTL_MS = 3 * 60 * 60_000;

export type DiscordUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  signedInAt: number;
};

type SessionData = Partial<{
  challenge: Challenge;
  user: DiscordUser;
  oauth: { state: string; uid: string };
}>;

export async function getSession(req: IncomingMessage, res: ServerResponse) {
  const session = await getIronSession<SessionData>(req, res, {
    password: env.SECRET_KEY,
    cookieName: "poketwo-verify",
    ttl: SIGN_IN_TTL_MS / 1000,
  });
  return session;
}

export const signedInUser = (session: IronSession<SessionData>) => {
  const { user } = session;
  if (!user || Date.now() - user.signedInAt >= SIGN_IN_TTL_MS) return undefined;
  return user;
};
