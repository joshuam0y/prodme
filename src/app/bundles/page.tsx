import Link from "next/link";

export default function BundlesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Beat bundles disabled for now
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500">
          This section isn&apos;t wired up yet. You can still complete your profile
          and use Discover.
        </p>
      </div>

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
