import { getAppErrorMessage } from "@/components/errors/appErrorUtils";
import { ButtonLink } from "@/components/ui/Button";

type Props = {
  error?: unknown;
};

export function AppErrorFallback({ error }: Props) {
  const message = getAppErrorMessage(error);
  const devDetail =
    import.meta.env.DEV && error instanceof Error && error.stack
      ? error.stack
      : import.meta.env.DEV && error != null
        ? String(error)
        : null;

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-swg-bg p-8 px-4 text-center">
      <p className="mb-8 text-2xl font-medium leading-tight text-swg-black" role="alert">
        Ein Fehler ist aufgetreten.
        <br />
        Bitte versuche es erneut.
      </p>
      <p className="mb-8 max-w-md font-text text-base leading-tight text-swg-black opacity-85">
        {message}
      </p>
      <ButtonLink to="/">Zur Startseite</ButtonLink>
      {devDetail ? (
        <pre className="mt-8 max-h-48 max-w-full overflow-auto rounded-lg bg-white p-3 text-left text-xs text-red-900">
          {devDetail}
        </pre>
      ) : null}
    </div>
  );
}
