'use client';

import NextLink from 'next/link';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react';

import { startNavigationProgress } from './navigationProgress';

const ROUTER_STATE_KEY = '__next_router_state';

/** Current path, or '' on the server where there is nothing to compare against. */
function currentPath(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

type StoredNavigation = { path: string; state: unknown };

/** Shared across all useLocation() callers so Layout/SEO do not steal navigation state. */
let sharedNavigationState: StoredNavigation | null = null;

/**
 * sessionStorage does not exist during server rendering. Every access below is
 * guarded — an unguarded read throws and takes the whole page tree down with
 * it, leaving crawlers nothing but the root error fallback.
 */
function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function pathOnly(url: string): string {
  return url.split('?')[0] || '/';
}

function setNavigationState(path: string, state: unknown) {
  sharedNavigationState = { path: pathOnly(path), state };
  if (!hasSessionStorage()) return;
  sessionStorage.setItem(ROUTER_STATE_KEY, JSON.stringify(sharedNavigationState));
}

/**
 * In-memory lookup only — safe to call while rendering (including on the
 * server, where it always yields undefined, matching the first client render).
 */
function readNavigationStateSync(pathname: string): unknown | undefined {
  if (sharedNavigationState?.path === pathOnly(pathname)) {
    return sharedNavigationState.state;
  }
  return undefined;
}

function readNavigationState(pathname: string): unknown | undefined {
  const path = pathOnly(pathname);

  if (sharedNavigationState?.path === path) {
    return sharedNavigationState.state;
  }

  if (!hasSessionStorage()) return undefined;

  const raw = sessionStorage.getItem(ROUTER_STATE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as StoredNavigation | unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'path' in parsed &&
      'state' in parsed &&
      (parsed as StoredNavigation).path === path
    ) {
      sharedNavigationState = parsed as StoredNavigation;
      return (parsed as StoredNavigation).state;
    }
  } catch {
    sessionStorage.removeItem(ROUTER_STATE_KEY);
  }

  return undefined;
}

function clearNavigationState(pathname: string) {
  if (sharedNavigationState?.path === pathOnly(pathname)) {
    sharedNavigationState = null;
  }
  if (!hasSessionStorage()) return;
  sessionStorage.removeItem(ROUTER_STATE_KEY);
}

type SetSearchParamsOptions = { replace?: boolean };

type LinkProps = {
  to?: string;
  href?: string;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
} & Omit<ComponentProps<typeof NextLink>, 'href' | 'children'>;

export function Link({ to, href, replace, state, children, onClick, ...rest }: LinkProps) {
  const destination = to ?? href ?? '/';

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (state) {
      setNavigationState(destination, state);
    }

    // Announced here because every in-app link in the app is this component,
    // so one place covers the whole site. Skipped when the browser is going to
    // handle the click itself — a new tab, a download, a modified click — as
    // no in-app navigation follows and the bar would never be cleared.
    const handledByBrowser = event.defaultPrevented
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || (rest.target && rest.target !== '_self');

    if (!handledByBrowser && pathOnly(destination) !== pathOnly(currentPath())) {
      startNavigationProgress();
    }

    onClick?.(event);
  };

  return (
    <NextLink href={destination} replace={replace} onClick={handleClick} {...rest}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === 'number') {
        window.history.go(to);
        return;
      }
      if (options?.state) {
        setNavigationState(to, options.state);
      }
      if (pathOnly(to) !== pathOnly(currentPath())) {
        startNavigationProgress();
      }
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router]
  );
}

export function useLocation() {
  const pathname = usePathname() ?? '/';
  const nextParams = useNextSearchParams();
  const search = nextParams?.toString() ? `?${nextParams.toString()}` : '';
  // Initialised from memory only, so server and first client render agree; the
  // effect below pulls any persisted state in immediately after mount.
  const [state, setState] = useState<unknown>(() => readNavigationStateSync(pathname));

  useEffect(() => {
    setState(readNavigationState(pathname));
    return () => {
      clearNavigationState(pathname);
    };
  }, [pathname, search]);

  return useMemo(
    () => ({
      pathname,
      search,
      hash: '',
      state,
      key: 'default',
    }),
    [pathname, search, state]
  );
}

export function Navigate({
  to,
  replace,
  state,
}: {
  to: string;
  replace?: boolean;
  state?: unknown;
}) {
  const router = useRouter();
  useEffect(() => {
    if (state) setNavigationState(to, state);
    if (replace) router.replace(to);
    else router.push(to);
  }, [to, replace, state, router]);
  return null;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  return useNextParams() as T;
}

type SetSearchParamsArg =
  | URLSearchParams
  | Record<string, string>
  | ((prev: URLSearchParams) => URLSearchParams);

export function useSearchParams(): [
  URLSearchParams,
  (arg: SetSearchParamsArg, options?: SetSearchParamsOptions) => void,
] {
  const nextParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const searchParams = useMemo(
    () => new URLSearchParams(nextParams?.toString() ?? ''),
    [nextParams]
  );

  const setSearchParams = useCallback(
    (arg: SetSearchParamsArg, options?: SetSearchParamsOptions) => {
      const base = new URLSearchParams(searchParams.toString());
      const next =
        typeof arg === 'function'
          ? arg(base)
          : arg instanceof URLSearchParams
            ? arg
            : (() => {
                const merged = new URLSearchParams(base);
                Object.entries(arg).forEach(([key, value]) => {
                  if (value === '' || value == null) merged.delete(key);
                  else merged.set(key, value);
                });
                return merged;
              })();

      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) router.replace(url);
      else router.push(url);
    },
    [pathname, router, searchParams]
  );

  return [searchParams, setSearchParams];
}
