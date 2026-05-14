import { CheckCircleIcon, ExclamationIcon } from "@heroicons/react/solid";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import publicEnv from "~/lib/public-env";

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

const Page = () => {
  const { uid, error, success } = useRouter().query;

  const [token, setToken] = useState<string | undefined>();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="max-w-xs w-full flex flex-col items-start space-y-5">
        {success && <Alert success message={success.toString()} />}
        {error && <Alert message={error.toString()} />}

        {!success && (
          <form
            action={`/api/recaptcha`}
            method="POST"
            className="w-full flex flex-col items-start space-y-5"
          >
            <h1 className="text-2xl font-bold">Please verify to continue</h1>

            <input type="hidden" name="uid" value={uid} />

            <ReCAPTCHA
              sitekey={publicEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              onChange={(token) => setToken(token ?? undefined)}
            />

            <button
              type="submit"
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={token === undefined}
            >
              Verify
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Page;
