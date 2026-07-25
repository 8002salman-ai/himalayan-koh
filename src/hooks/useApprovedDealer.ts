import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { dealerApi } from '@/lib/supabase/api/dealer';
import { publicEnv } from '@/lib/env';

/**
 * Lightweight client-side check for "is this signed-in user an approved
 * dealer" — used only to route the shared cart/checkout UI to the wholesale
 * purchase-request flow instead of retail checkout. The server always
 * re-verifies this independently (isApprovedDealer() in
 * serverCreatePurchaseRequest.ts) before accepting a purchase request, so
 * this hook is a UX convenience only, never a security boundary.
 *
 * While wholesale is disabled (see src/lib/env.ts), this always resolves to
 * false so CartDrawer.tsx's dealer-checkout fork never activates and every
 * cart routes to retail checkout, regardless of an account's approval status.
 */
export function useApprovedDealer(): { isApprovedDealer: boolean; loading: boolean } {
  const { user, isAuthenticated } = useAuthContext();
  const [isApprovedDealer, setIsApprovedDealer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!publicEnv.wholesaleEnabled || !isAuthenticated || !user?.id) {
      setIsApprovedDealer(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    dealerApi
      .getMyApplication(user.id)
      .then((application) => {
        if (!cancelled) setIsApprovedDealer(application?.status === 'approved');
      })
      .catch(() => {
        if (!cancelled) setIsApprovedDealer(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  return { isApprovedDealer, loading };
}
