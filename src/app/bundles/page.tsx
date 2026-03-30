import Link from "next/link";
import { mockBundles } from "@/data/mock";

export default function BundlesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Beat bundles
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500">
          Producers list packs with previews. Checkout stays off for now — this
          is a browse-only preview of the experience.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockBundles.map((b) => (
          <li
            key={b.id}
            className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${b.accent} bg-zinc-900/80`}
          >
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                {b.creatorName}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-100">
                {b.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {b.trackCount} tracks · {b.genres.join(" · ")}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-lg font-semibold text-amber-400">
                  {b.priceLabel}
                </span>
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/15"
                >
                  Preview
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-sm text-zinc-600">
        Selling your own packs?{" "}
        <Link href="/onboarding" className="text-amber-500 hover:underline">
          Complete your profile
        </Link>{" "}
        first.
      </p>
    </main>
  );
}
