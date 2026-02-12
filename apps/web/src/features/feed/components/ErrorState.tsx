export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="h-dvh w-screen grid place-items-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-2 text-sm text-white/70">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

