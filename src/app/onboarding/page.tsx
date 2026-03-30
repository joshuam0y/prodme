import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isVercelRuntime } from "@/lib/env";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    const onVercel = isVercelRuntime();
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <h1 className="text-lg font-semibold text-zinc-100">
            Supabase not configured
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {onVercel ? (
              <>
                In the Vercel dashboard open this project →{" "}
                <strong className="text-zinc-400">Settings → Environment Variables</strong>{" "}
                and add{" "}
                <code className="text-zinc-400">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="text-zinc-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                (same values as in your local{" "}
                <code className="text-zinc-400">.env.local</code>). Enable them
                for <strong className="text-zinc-400">Production</strong>, then{" "}
                <strong className="text-zinc-400">Redeploy</strong>.
              </>
            ) : (
              <>
                Add{" "}
                <code className="text-zinc-400">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="text-zinc-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                to <code className="text-zinc-400">.env.local</code>, run the SQL
                in <code className="text-zinc-400">supabase/migrations</code>,
                then restart the dev server (
                <code className="text-zinc-400">npm run dev</code>).
              </>
            )}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-amber-500 hover:underline"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <OnboardingForm error={params.error} />
    </main>
  );
}
