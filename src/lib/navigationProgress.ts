/**
 * A signal that a navigation has begun.
 *
 * With no loading.tsx below a layout, Next keeps the current page on screen
 * until the next one is ready — which is what makes navigation feel continuous
 * rather than flickering through a skeleton. The cost is that a click produces
 * no immediate feedback, and on a slower route that reads as the click not
 * having registered.
 *
 * A progress bar closes that gap without taking the page away. Every in-app
 * link and programmatic navigation runs through the router compatibility layer,
 * so announcing it there covers the whole site from one place — no page has to
 * remember to report its own transitions.
 *
 * Deliberately a module-level store rather than context: it is written from
 * event handlers outside React's tree.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let navigating = false;

/** Called when a link is followed or a navigation is triggered in code. */
export function startNavigationProgress(): void {
  if (navigating) return;
  navigating = true;
  listeners.forEach((listener) => listener());
}

/** Called once the new route has rendered. */
export function endNavigationProgress(): void {
  if (!navigating) return;
  navigating = false;
  listeners.forEach((listener) => listener());
}

export function isNavigating(): boolean {
  return navigating;
}

export function subscribeNavigationProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
