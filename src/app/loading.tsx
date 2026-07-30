/**
 * Root Suspense boundary.
 *
 * Load-bearing beyond its appearance: several admin pages call
 * useSearchParams(), which Next requires to sit inside a Suspense boundary, and
 * this is the boundary they inherit. Deleting it fails the build at
 * /admin/dealers/audit rather than merely changing what is drawn.
 *
 * It is reached on a cold load, not when moving between pages — the (main),
 * (protected) and admin groups each have their own loading file below their
 * layout, so navigation replaces the content area while the header, nav and
 * footer stay put.
 *
 * Drawn as a quiet skeleton on the site's own background rather than a centred
 * line of text on an empty screen: the text version announced itself, held the
 * whole viewport, then vanished, which read as a page of its own rather than a
 * page arriving.
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-warm-white" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* A header-sized band, so the real header does not appear to drop in. */}
      <div className="h-16 md:h-20 border-b border-himalayan-line bg-cream" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="h-9 w-2/3 rounded-xl bg-himalayan-line/60 animate-pulse" />
        <div className="mt-4 h-5 w-full rounded-lg bg-himalayan-line/40 animate-pulse" />
        <div className="mt-2 h-5 w-5/6 rounded-lg bg-himalayan-line/40 animate-pulse" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="h-44 rounded-2xl bg-himalayan-line/40 animate-pulse" />
          <div className="h-44 rounded-2xl bg-himalayan-line/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
