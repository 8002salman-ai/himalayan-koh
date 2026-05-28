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

const ROUTER_STATE_KEY = '__next_router_state';

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
      sessionStorage.setItem(ROUTER_STATE_KEY, JSON.stringify(state));
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
        sessionStorage.setItem(ROUTER_STATE_KEY, JSON.stringify(options.state));
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
  const [state, setState] = useState<unknown>(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem(ROUTER_STATE_KEY);
    if (!raw) return;
    try {
      setState(JSON.parse(raw) as unknown);
    } catch {
      setState(undefined);
    }
    sessionStorage.removeItem(ROUTER_STATE_KEY);
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
    if (state) sessionStorage.setItem(ROUTER_STATE_KEY, JSON.stringify(state));
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
