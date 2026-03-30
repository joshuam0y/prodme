import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-amber-500/90">
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-500">
        That link doesn&apos;t exist or was moved. Head back and keep digging.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
      >
        Back home
      </Link>
    </main>
  );
}
