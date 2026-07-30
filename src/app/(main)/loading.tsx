import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Storefront loading state, deliberately placed inside the (main) group.
 *
 * The only loading file used to sit at the app root, which put the Suspense
 * boundary ABOVE this group's layout. Every navigation therefore tore down the
 * header, nav and footer and replaced the whole viewport with a bare "Loading"
 * screen, then rebuilt them — so moving between two pages of the same site
 * looked like leaving it and coming back.
 *
 * Here the boundary sits below that layout: the chrome stays put and only the
 * content area is replaced, which is the difference between a flash and a
 * transition. The shapes mirror a typical page (heading, lead paragraph, body)
 * so the swap does not jump when the real content lands.
 */
export default function MainLoading() {
  return (
    <div className="min-h-[60vh] bg-warm-white" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <Skeleton className="h-9 w-2/3 rounded-xl" />
        <Skeleton className="mt-4 h-5 w-full rounded-lg" />
        <Skeleton className="mt-2 h-5 w-5/6 rounded-lg" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>

        <Skeleton className="mt-8 h-5 w-4/5 rounded-lg" />
        <Skeleton className="mt-2 h-5 w-3/5 rounded-lg" />
      </div>
    </div>
  );
}
