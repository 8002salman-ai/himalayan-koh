import { SkeletonTable } from '@/components/ui/Skeleton';

/**
 * Admin loading state, below AdminLayout so the sidebar and header survive a
 * navigation. Without a loading file here the nearest boundary was the app
 * root, which replaced the entire admin shell — sidebar included — on every
 * move between Products, Orders and Settings.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <table className="w-full">
        <SkeletonTable rows={6} />
      </table>
    </div>
  );
}
