export function SkeletonCard() {
  return (
    <section className="relative h-dvh w-screen snap-start overflow-hidden bg-bg">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/5 via-white/0 to-white/5" />
      <div className="relative z-10 p-5 pt-10">
        <div className="h-6 w-36 rounded-full bg-white/10" />
      </div>
      <div className="relative z-10 flex h-[calc(100dvh-160px)] flex-col justify-end px-5 pb-6">
        <div className="h-10 w-11/12 rounded-md bg-white/10" />
        <div className="mt-3 h-4 w-10/12 rounded bg-white/10" />
        <div className="mt-2 h-4 w-9/12 rounded bg-white/10" />
        <div className="mt-2 h-4 w-8/12 rounded bg-white/10" />
        <div className="mt-6 h-10 w-32 rounded-full bg-white/10" />
      </div>
      <div className="relative z-10 border-t border-white/10 bg-black/20 px-4 py-3">
        <div className="mx-auto flex max-w-md justify-between">
          <div className="h-8 w-24 rounded-full bg-white/10" />
          <div className="h-8 w-24 rounded-full bg-white/10" />
          <div className="h-8 w-24 rounded-full bg-white/10" />
        </div>
      </div>
    </section>
  );
}

