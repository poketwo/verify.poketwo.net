import { CheckCircleIcon, ExclamationIcon } from "@heroicons/react/solid";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { createChallenge } from "~/lib/challenge";
import publicEnv from "~/lib/public-env";
import { getSession, signedInUser } from "~/lib/session";
import { isUid } from "~/lib/uid";

type AlertProps = {
  success?: boolean;
  message: string;
};

const Alert = ({ success, message }: AlertProps) => {
  const color = success ? "green" : "red";
  const Icon = success ? CheckCircleIcon : ExclamationIcon;
  const title = success ? "Success!" : "Error";

  return (
    <div className={`rounded-md bg-${color}-50 p-4 w-full`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 text-${color}-400`} aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium text-${color}-800`}>{title}</h3>
          <div className={`mt-2 text-sm text-${color}-700`}>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

type Account = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
};

type PageProps = {
  nonce: string | null;
  account: Account | null;
};

const DEFAULT_AVATAR_COUNT = 6;

const avatarUrl = (id: string, avatar: string | null) =>
  avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(
        (BigInt(id) >> BigInt(22)) % BigInt(DEFAULT_AVATAR_COUNT),
      )}.png`;

const loginUrl = (uid: string) => `/api/login?${new URLSearchParams({ uid })}`;

const SignedInAs = ({ uid, account }: { uid: string; account: Account }) => (
  <div className="w-full rounded-md bg-discord-darker p-3 flex items-center space-x-3">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={account.avatarUrl}
      alt=""
      className="h-10 w-10 rounded-full flex-shrink-0"
    />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-400">Signed in as</p>
      <p className="text-sm font-semibold truncate">{account.name}</p>
      <p className="text-xs text-gray-400 truncate">@{account.username}</p>
      <p className="text-xs text-gray-400">{account.id}</p>
    </div>
    <a
      href={loginUrl(uid)}
      className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-md bg-discord-button hover:opacity-90"
    >
      Switch account
    </a>
  </div>
);

const SignIn = ({
  uid,
  wrongAccount,
}: {
  uid: string;
  wrongAccount: boolean;
}) => (
  <>
    <p className="text-sm text-gray-300">
      {wrongAccount
        ? "This captcha is for a different Discord account. Sign in with that one instead."
        : "Sign in with Discord first so we know it\u2019s you."}
    </p>
    <a
      href={loginUrl(uid)}
      className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-discord-blurple hover:opacity-90"
    >
      Sign in with Discord
    </a>
  </>
);

const Captcha = ({ uid, nonce }: { uid: string; nonce: string }) => {
  const [token, setToken] = useState<string | undefined>();

  return (
    <form
      action="/api/verify"
      method="POST"
      className="flex flex-col items-start space-y-5"
    >
      <input type="hidden" name="uid" value={uid} />
      <input type="hidden" name="nonce" value={nonce} />

      <HCaptcha
        sitekey={publicEnv.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
        theme="dark"
        onVerify={(token) => setToken(token)}
        onExpire={() => setToken(undefined)}
      />

      <button
        type="submit"
        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={token === undefined}
      >
        Verify
      </button>
    </form>
  );
};

const Page = ({ nonce, account }: PageProps) => {
  const { uid, error, success } = useRouter().query;
  if (typeof uid !== "string") return null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-discord-dark text-gray-100">
      <div className="max-w-xs w-full flex flex-col items-start space-y-5">
        {success && <Alert success message={success.toString()} />}
        {error && <Alert message={error.toString()} />}

        {!success && (
          <>
            <h1 className="text-2xl font-bold">Please verify to continue</h1>
            {account && <SignedInAs uid={uid} account={account} />}
            {nonce ? (
              <Captcha uid={uid} nonce={nonce} />
            ) : (
              <SignIn uid={uid} wrongAccount={account !== null} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
  req,
  res,
  params,
}) => {
  const uid = params?.uid;
  if (!isUid(uid)) return { notFound: true };

  const session = await getSession(req, res);
  const user = signedInUser(session);
  const account = user
    ? {
        id: user.id,
        name: user.globalName ?? user.username,
        username: user.username,
        avatarUrl: avatarUrl(user.id, user.avatar),
      }
    : null;
  if (user?.id !== uid) return { props: { nonce: null, account } };

  session.challenge = createChallenge(uid);
  await session.save();

  return { props: { nonce: session.challenge.nonce, account } };
};

export default Page;
