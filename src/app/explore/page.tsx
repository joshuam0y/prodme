import { SwipeStack } from "@/components/swipe-stack";
import { mockProfiles } from "@/data/mock";

export default function ExplorePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Discover
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sample profiles — pass, save, or show interest. Real matching comes
          next.
        </p>
      </div>
      <SwipeStack profiles={mockProfiles} />
    </main>
  );
}
