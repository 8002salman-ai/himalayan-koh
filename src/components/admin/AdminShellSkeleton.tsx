/**
 * The console's first paint, before the admin session is known.
 *
 * `/admin` is prerendered, and a browser has no session while the server renders,
 * so the document that arrives is whatever this gate renders with no identity. It
 * used to be a full-screen charcoal panel reading "Loading admin panel..." — a
 * screen that looks like neither the console nor the storefront, which is why
 * opening the dashboard appeared to show an old/error page first and the real
 * dashboard afterwards.
 *
 * This renders the console's own chrome instead — the dark rail, the header, the
 * content surface — with skeleton rows where the data will be. Same background,
 * same geometry, same title: the only thing that changes when the session
 * resolves is the content, so there is no wrong screen to flash through. It is a
 * pending state, not a second implementation of the console.
 */
export default function AdminShellSkeleton() {
  return (
    <div
      className="h-screen bg-gray-100 flex overflow-hidden font-sans"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading the admin console…</span>

      {/* Rail */}
      <aside
        className="hidden lg:flex w-60 h-screen sticky top-0 shrink-0 flex-col"
        style={{
          background: 'linear-gradient(180deg, #0f231b 0%, #173629 55%, #0f231b 100%)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="px-3.5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm border border-white/10"
            style={{ background: 'linear-gradient(135deg, #1E4636, #C5A880)' }}
          >
            HK
          </span>
          <div className="leading-tight">
            <span className="font-bold text-sm text-white tracking-tight block">Himalayan Koh</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-medium">
              Admin Console
            </span>
          </div>
        </div>
        <div className="flex-1 p-2 space-y-3">
          {[6, 10, 4].map((rows, group) => (
            <div key={group} className="space-y-1.5">
              <div className="h-2 w-16 rounded bg-white/[0.06] mx-2.5 mb-1" />
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 py-[7px]">
                  <span className="w-[26px] h-[26px] rounded-md bg-white/[0.07]" />
                  <span className="h-2 rounded bg-white/[0.06] flex-1" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 shrink-0 bg-white/90 backdrop-blur-md border-b border-gray-200/80 flex items-center justify-between gap-3 px-4 lg:px-6">
          <div className="h-8 w-64 rounded-lg bg-gray-100 border border-gray-200" />
          <div className="h-8 w-8 rounded-lg bg-gray-100" />
        </header>

        {/* Content canvas */}
        <main
          className="flex-1 overflow-y-auto min-w-0 p-3 lg:p-5"
          style={{ background: 'linear-gradient(180deg, #FAF8F5 0%, #F5F2EC 100%)' }}
        >
          <div className="space-y-4">
            <div className="h-5 w-40 rounded bg-gray-200/70" />
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100" />
                  <div className="mt-2.5 h-4 w-16 rounded bg-gray-200/70" />
                  <div className="mt-1.5 h-2 w-20 rounded bg-gray-100" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-3 rounded bg-gray-100" style={{ width: `${92 - i * 6}%` }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
