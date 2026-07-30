'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  endNavigationProgress,
  isNavigating,
  subscribeNavigationProgress,
} from '../lib/navigationProgress';

/**
 * A thin bar across the top while the next page is being fetched.
 *
 * The page underneath stays exactly where it is, so this is the only thing that
 * moves during a navigation — the alternative, swapping the content for a
 * skeleton, flashes on any transition quick enough not to need one.
 *
 * It creeps toward 90% rather than tracking real progress, which is not
 * knowable, then completes when the route actually changes. The point is to
 * confirm the click landed, not to predict a duration.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useSyncExternalStore(
    subscribeNavigationProgress,
    isNavigating,
    () => false,
  );
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  // A new route rendered — whatever was in flight has arrived.
  useEffect(() => {
    endNavigationProgress();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setWidth(12);
      // Approach 90% and wait there. Reaching 100% before the page is ready
      // would claim the navigation had finished when it had not.
      const creep = setInterval(() => {
        setWidth((current) => (current >= 90 ? current : current + (90 - current) * 0.18));
      }, 180);

      // A navigation that never completes — a route that throws, a click the
      // router discards, a prefetch that stalls — would otherwise leave the bar
      // on screen for the rest of the session, which looks far more broken than
      // the pause it was meant to explain. Clearing it after ten seconds is
      // wrong about the navigation but right about the interface.
      const failsafe = setTimeout(endNavigationProgress, 10_000);

      return () => {
        clearInterval(creep);
        clearTimeout(failsafe);
      };
    }

    if (!visible) return undefined;

    setWidth(100);
    // Held briefly at full width so the completion is seen rather than
    // disappearing in the same frame it is drawn.
    const hide = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 220);
    return () => clearTimeout(hide);
  }, [active, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] h-0.5 pointer-events-none"
      role="progressbar"
      aria-hidden="true"
    >
      <div
        className="h-full bg-himalayan transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
