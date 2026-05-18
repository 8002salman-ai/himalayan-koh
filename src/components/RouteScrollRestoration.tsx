import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteScrollRestoration() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname, search]);

  return null;
}
