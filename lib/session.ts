import { getIronSession } from "iron-session";
import { IncomingMessage, ServerResponse } from "http";
import { Challenge } from "./challenge";
import env from "./env";

type SessionData = Partial<{
  challenge: Challenge;
  discordId: string;
  oauth: { state: string; uid: string };
}>;

export async function getSession(req: IncomingMessage, res: ServerResponse) {
  const session = await getIronSession<SessionData>(req, res, {
    password: env.SECRET_KEY,
    cookieName: "poketwo-verify",
  });
  return session;
}
