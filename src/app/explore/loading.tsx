export default function ExploreLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-3 text-center">
        <div className="mx-auto h-8 w-48 animate-pulse rounded-md bg-zinc-800" />
        <div className="mx-auto h-4 w-72 max-w-full animate-pulse rounded bg-zinc-800/80" />
      </div>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded-full bg-zinc-800/80"
          />
        ))}
      </div>
      <div className="min-h-[420px] animate-pulse rounded-2xl border border-white/5 bg-zinc-900/30" />
    </main>
  );
}
