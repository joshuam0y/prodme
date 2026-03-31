import Image from "next/image";
import Link from "next/link";
import { ConfirmedClient } from "./confirmed-client";

function safeNext(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/explore";
  return path;
}

function safeKind(kind: string | undefined): "signup" | "invite" | "email_change" {
  if (kind === "invite" || kind === "email_change") return kind;
  return "signup";
}

export default async function AuthConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const kind = safeKind(params.kind);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-flex" aria-label="prodLink home">
          <Image
            src="/prodlink-logo-v2.svg"
            alt="prodLink"
            width={210}
            height={55}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>
      <ConfirmedClient next={next} kind={kind} />
    </main>
  );
}
