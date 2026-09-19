'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Percent, RefreshCw, Ticket } from 'lucide-react';
import {
  AdminButton,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { fetchAdminCoupons, type AdminCoupon } from '../../lib/admin/consoleApi';
import { getErrorMessage } from '../../lib/errors';

type Tab = 'promotions' | 'coupons' | 'scheduled';

const TABS: { id: Tab; label: string }[] = [
  { id: 'promotions', label: 'Promotions' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'scheduled', label: 'Scheduled' },
];

/**
 * Promotions — the umbrella view over what WooCommerce can actually do.
 *
 * The rule this screen exists to keep: it never becomes a second place to create a
 * discount. Coupon codes are created and edited on the Coupons screen, where the
 * write path to WooCommerce lives; this page summarises them and states which
 * promotion concepts the store's own platform supports.
 *
 * "Not connected" used to be the honest answer for every figure here. It is not
 * any more — coupons are readable — so the tiles that have a real source now show
 * it, and the ones that do not say what they are waiting for instead of showing a
 * zero that would read as "no promotions".
 */
export default function AdminPromotions() {
  const [tab, setTab] = useState<Tab>('promotions');
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCoupons(await fetchAdminCoupons());
    } catch (err) {
      setCoupons([]);
      setError(getErrorMessage(err, 'Coupons could not be read from the store.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = coupons.filter((coupon) => coupon.state === 'active');
  const scheduled = coupons.filter((coupon) => coupon.state === 'scheduled');
  const expiringSoon = coupons.filter((coupon) => {
    if (!coupon.date_expires_gmt) return false;
    const expires = new Date(`${coupon.date_expires_gmt}Z`).getTime();
    return expires > Date.now() && expires - Date.now() < 30 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Promotions"
        description="Discounts, coupons and scheduled price rules. WooCommerce is the authority for what a customer is charged."
        actions={
          <AdminButton icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </AdminButton>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="The store could not be read">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Live coupon codes"
          icon={Percent}
          tone="brand"
          value={loading ? undefined : active.length}
          unavailable={loading ? 'Reading…' : undefined}
          hint="Read from WooCommerce"
        />
        <AdminStatTile
          label="Coupons in the store"
          icon={Ticket}
          tone="slate"
          value={loading ? undefined : coupons.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Expiring within 30 days"
          icon={CalendarClock}
          tone={expiringSoon.length > 0 ? 'amber' : 'slate'}
          value={loading ? undefined : expiringSoon.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'promotions' && (
        <AdminPanel
          title="Which promotion concepts this store supports"
          description="Stated against WooCommerce's own capabilities, not against a wish list"
        >
          <ul className="space-y-3 text-sm text-admin-ink">
            <li>
              <strong>Coupon codes</strong> — supported, and live.{' '}
              <Link to="/admin/coupons" className="font-semibold text-himalayan hover:underline">
                Manage them on the Coupons screen
              </Link>
              , which writes to WooCommerce directly.
            </li>
            <li>
              <strong>Scheduled sale prices</strong> — supported by WooCommerce core, as a sale price with a start
              and an end date on a product. There is no screen for it here because writing one would mean this page
              editing product prices, and the product editor is the one place a price is changed.
            </li>
            <li>
              <strong>Buy-one-get-one, tiered and cart-level rules</strong> — not supported by WooCommerce core.
              They need a plugin on the store. This console will not simulate them with a locally-held rule that
              the store does not enforce.
            </li>
            <li>
              <strong>Free shipping over a threshold</strong> — the storefront&apos;s own checkout maths carries a
              $50 threshold. Whether WooCommerce agrees with it is a decision for the owner, not something this
              console changes on its own.
            </li>
          </ul>
        </AdminPanel>
      )}

      {tab === 'coupons' && (
        <AdminPanel
          title="Coupons"
          description="Discount codes — owned by WooCommerce and managed on their own screen"
          action={<AdminChip tone="neutral">{coupons.length} in store</AdminChip>}
        >
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-admin-muted">Reading the store…</p>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-admin-muted">The store holds no coupons.</p>
            ) : (
              <ul className="space-y-2">
                {coupons.map((coupon) => (
                  <li
                    key={coupon.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-admin-line px-4 py-2.5"
                  >
                    <span className="font-medium text-admin-ink">{coupon.code}</span>
                    <span className="text-sm text-admin-muted">
                      {coupon.discount_type === 'percent'
                        ? `${Number(coupon.amount)}% off`
                        : `$${Number(coupon.amount).toFixed(2)} off`}
                    </span>
                    <AdminChip
                      tone={
                        coupon.state === 'active'
                          ? 'success'
                          : coupon.state === 'expired'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {coupon.state}
                    </AdminChip>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-admin-muted">
              Create, edit, publish and delete on the{' '}
              <Link to="/admin/coupons" className="font-semibold text-himalayan hover:underline">
                Coupons
              </Link>{' '}
              screen — one place to create a code, so there is one place to look when one does not apply.
            </p>
          </div>
        </AdminPanel>
      )}

      {tab === 'scheduled' && (
        <AdminPanel
          title="Scheduled discounts"
          description="Coupon codes with an expiry in the next 30 days, as the store reports them"
        >
          {loading ? (
            <p className="text-sm text-admin-muted">Reading the store…</p>
          ) : expiringSoon.length === 0 ? (
            <p className="text-sm text-admin-muted">
              {scheduled.length > 0
                ? 'No coupon expires in the next 30 days.'
                : 'No coupon in the store expires in the next 30 days.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {expiringSoon.map((coupon) => (
                <li key={coupon.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-admin-ink">{coupon.code}</span>
                  <span className="text-admin-muted">
                    expires {coupon.date_expires_gmt?.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      )}
    </div>
  );
}
