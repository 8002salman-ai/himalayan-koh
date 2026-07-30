import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Account-area loading state, below this group's layout so the site header and
 * footer stay on screen. Same reason as (main)/loading.tsx: with only the root
 * loading file, moving between Orders, Account and Wishlist blanked the whole
 * page rather than just the panel being replaced.
 */
export default function ProtectedLoading() {
  return (
    <div className="min-h-[60vh] bg-warm-white" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
