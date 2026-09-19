'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, Save, Ticket, Trash2 } from 'lucide-react';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminField,
  AdminInput,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';
import {
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
  type AdminCoupon,
  type AdminCouponInput,
  type CouponState,
} from '../../lib/admin/consoleApi';
import { getErrorMessage } from '../../lib/errors';

/**
 * Coupons.
 *
 * WooCommerce owns discounts, and this screen is the only place a code is created
 * or changed — the store applies it at checkout, so a coupon that exists here
 * exists for real. Three behaviours are deliberate:
 *
 *  - **Nothing is optimistic.** A create, edit or delete is followed by a read of
 *    the store, and the table shows what the store now holds. A form that reported
 *    success on its own would be the exact failure this migration exists to remove.
 *  - **A delete is a real delete, and says what it does.** Removing a coupon stops
 *    it being redeemable; the orders that used it keep their own record of the
 *    discount, so history is not lost, and the dialog says so.
 *  - **The state is the store's.** Expired and draft codes are listed with that
 *    state instead of looking live, because "a code exists" and "a code works" are
 *    different facts.
 */

const DISCOUNT_TYPES: Array<{ id: AdminCoupon['discount_type']; label: string }> = [
  { id: 'percent', label: 'Percentage off' },
  { id: 'fixed_cart', label: 'Fixed amount off the cart' },
  { id: 'fixed_product', label: 'Fixed amount off each product' },
];

const STATE_TONES: Record<CouponState, 'success' | 'info' | 'warning' | 'muted'> = {
  active: 'success',
  scheduled: 'info',
  expired: 'warning',
  draft: 'muted',
};

const EMPTY_FORM: AdminCouponInput = {
  code: '',
  discountType: 'percent',
  amount: 10,
  description: '',
  dateExpires: null,
  minimumAmount: null,
  maximumAmount: null,
  usageLimit: null,
  usageLimitPerUser: null,
  freeShipping: false,
  published: false,
};

function money(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function describeAmount(coupon: AdminCoupon): string {
  const amount = money(coupon.amount);
  if (coupon.discount_type === 'percent') return `${amount}% off`;
  if (coupon.discount_type === 'fixed_product') return `$${amount.toFixed(2)} off each item`;
  return `$${amount.toFixed(2)} off the cart`;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<AdminCouponInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminCoupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCoupons(await fetchAdminCoupons());
    } catch (err) {
      setCoupons([]);
      setError(getErrorMessage(err, 'The coupons could not be read from the store.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const active = coupons.filter((coupon) => coupon.state === 'active');
    const expired = coupons.filter((coupon) => coupon.state === 'expired');
    const redemptions = coupons.reduce((sum, coupon) => sum + Number(coupon.usage_count ?? 0), 0);
    return { active: active.length, expired: expired.length, redemptions };
  }, [coupons]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discountType: coupon.discount_type,
      amount: money(coupon.amount),
      description: coupon.description ?? '',
      dateExpires: coupon.date_expires_gmt ?? null,
      minimumAmount: money(coupon.minimum_amount) || null,
      maximumAmount: money(coupon.maximum_amount) || null,
      usageLimit: coupon.usage_limit ?? null,
      usageLimitPerUser: coupon.usage_limit_per_user ?? null,
      freeShipping: Boolean(coupon.free_shipping),
      published: coupon.status === 'publish',
    });
    setFormError(null);
    setEditorOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateAdminCoupon(editing.id, form);
        setNotice(`"${form.code}" was updated in the store.`);
      } else {
        await createAdminCoupon(form);
        setNotice(
          form.published
            ? `"${form.code}" was created and is live in the store.`
            : `"${form.code}" was created as a draft. Publish it when you want it to apply.`
        );
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err, 'The coupon could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const result = await deleteAdminCoupon(confirmDelete.id);
      setNotice(
        result.stillPresent
          ? `The store still lists "${confirmDelete.code}" after the delete. Nothing was changed here to hide that.`
          : `"${confirmDelete.code}" was deleted from the store. ${result.remaining} coupon${
              result.remaining === 1 ? '' : 's'
            } remain.`
      );
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'The coupon could not be deleted.'));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Commerce"
        title="Coupons"
        description="Discount codes, read from and written to WooCommerce — the only system that can apply one at checkout."
        actions={
          <>
            <AdminButton icon={RefreshCw} onClick={load} disabled={loading}>
              Refresh
            </AdminButton>
            <AdminButton variant="primary" icon={Plus} onClick={openCreate}>
              New coupon
            </AdminButton>
          </>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="The store could not be read">
          {error}
        </AdminNotice>
      )}
      {notice && (
        <AdminNotice
          tone="info"
          title="Store updated"
          action={
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-semibold text-admin-muted hover:text-admin-ink"
            >
              Dismiss
            </button>
          }
        >
          {notice}
        </AdminNotice>
      )}

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Coupons in store"
          icon={Ticket}
          tone="brand"
          value={loading ? undefined : coupons.length}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Live now"
          icon={Ticket}
          tone="green"
          value={loading ? undefined : summary.active}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Expired"
          icon={Ticket}
          tone="amber"
          value={loading ? undefined : summary.expired}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Redemptions"
          icon={Ticket}
          tone="slate"
          value={loading ? undefined : summary.redemptions}
          unavailable={loading ? 'Reading…' : undefined}
        />
      </div>

      <AdminPanel
        title="Discount codes"
        description="Exactly what WooCommerce holds. Nothing is created here that the store does not have."
        action={<AdminChip tone="neutral">{coupons.length} in WooCommerce</AdminChip>}
      >
        <AdminTable
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'discount', label: 'Discount' },
            { key: 'limits', label: 'Limits' },
            { key: 'usage', label: 'Used', align: 'right' },
            { key: 'state', label: 'State', align: 'right' },
            { key: 'actions', label: '', align: 'right' },
          ]}
        >
          {loading ? (
            <AdminTableSkeleton rows={4} columns={6} />
          ) : coupons.length === 0 ? (
            <tr>
              <td className={ADMIN_TD} colSpan={6}>
                <p className="py-10 text-center text-sm text-admin-muted">
                  The store holds no coupons. Create one and it applies at checkout once published.
                </p>
              </td>
            </tr>
          ) : (
            coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td className={ADMIN_TD}>
                  <p className="font-semibold text-admin-ink">{coupon.code}</p>
                  {coupon.description && (
                    <p className="text-[11px] text-admin-muted">{coupon.description}</p>
                  )}
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>
                  {describeAmount(coupon)}
                  {coupon.free_shipping && (
                    <span className="ml-2">
                      <AdminChip tone="info">Free shipping</AdminChip>
                    </span>
                  )}
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>
                  <p>
                    {money(coupon.minimum_amount) > 0
                      ? `Min $${money(coupon.minimum_amount).toFixed(2)}`
                      : 'No minimum'}
  {coupon.date_expires_gmt ? ` · Expires ${toDateInput(coupon.date_expires_gmt)}` : ''}
                  </p>
                </td>
                <td className={`${ADMIN_TD} text-right`}>
                  {Number(coupon.usage_count ?? 0)}
                  {coupon.usage_limit ? (
                    <span className="text-admin-muted"> / {coupon.usage_limit}</span>
                  ) : null}
                </td>
                <td className={`${ADMIN_TD} text-right`}>
                  <AdminChip tone={STATE_TONES[coupon.state]}>{coupon.state}</AdminChip>
                </td>
                <td className={`${ADMIN_TD} text-right`}>
                  <div className="flex justify-end gap-2">
                    <AdminButton onClick={() => openEdit(coupon)}>Edit</AdminButton>
                    <AdminButton icon={Trash2} onClick={() => setConfirmDelete(coupon)}>
                      Delete
                    </AdminButton>
                  </div>
                </td>
              </tr>
            ))
          )}
        </AdminTable>
      </AdminPanel>

      <AdminPanel title="How a coupon reaches a customer" description="Stated once, because it is the part that drifts">
        <ul className="space-y-2 text-sm text-admin-ink">
          <li>
            A code is only usable while it is <strong>published</strong> and not past its expiry. A draft code
            exists in the store and applies to nothing.
          </li>
          <li>
            Coupon codes are stored lower-cased by WooCommerce; this screen shows the store&apos;s own value so a
            customer typing either case gets the same answer.
          </li>
          <li>
            The storefront also knows one hard-coded code (<code>HKWELCOME10</code>) in its checkout maths, which
            is <em>not</em> a WooCommerce coupon. It is reported as a discrepancy rather than quietly created here:
            if that code is wanted, it has to exist in WooCommerce too.
          </li>
        </ul>
      </AdminPanel>

      {editorOpen && (
      <AdminModal
        onClose={() => setEditorOpen(false)}
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
      >
        <div className="space-y-4">
          {formError && <AdminNotice tone="danger" title="Not saved">{formError}</AdminNotice>}

          <AdminField label="Code">
            <AdminInput
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="e.g. WELCOME10"
            />
          </AdminField>

          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Type">
              <select
                value={form.discountType}
                onChange={(event) =>
                  setForm({ ...form, discountType: event.target.value as AdminCoupon['discount_type'] })
                }
                className="w-full rounded-xl border border-admin-line bg-admin-surface px-3 py-2.5 text-sm"
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField
              label={form.discountType === 'percent' ? 'Percentage (0–100)' : 'Amount (USD)'}
            >
              <AdminInput
                type="number"
                value={String(form.amount)}
                onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
              />
            </AdminField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Expires on" hint="Leave empty for no expiry">
              <AdminInput
                type="date"
                value={toDateInput(form.dateExpires ?? null)}
                onChange={(event) => setForm({ ...form, dateExpires: event.target.value || null })}
              />
            </AdminField>
            <AdminField label="Minimum spend" hint="Leave empty for none">
              <AdminInput
                type="number"
                value={form.minimumAmount == null ? '' : String(form.minimumAmount)}
                onChange={(event) =>
                  setForm({ ...form, minimumAmount: event.target.value ? Number(event.target.value) : null })
                }
              />
            </AdminField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Total uses" hint="Leave empty for unlimited">
              <AdminInput
                type="number"
                value={form.usageLimit == null ? '' : String(form.usageLimit)}
                onChange={(event) =>
                  setForm({ ...form, usageLimit: event.target.value ? Number(event.target.value) : null })
                }
              />
            </AdminField>
            <AdminField label="Uses per customer" hint="Leave empty for unlimited">
              <AdminInput
                type="number"
                value={form.usageLimitPerUser == null ? '' : String(form.usageLimitPerUser)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    usageLimitPerUser: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </AdminField>
          </div>

          <label className="flex items-center gap-3 text-sm text-admin-ink">
            <input
              type="checkbox"
              checked={form.freeShipping === true}
              onChange={(event) => setForm({ ...form, freeShipping: event.target.checked })}
            />
            Also gives free shipping
          </label>

          <label className="flex items-center gap-3 text-sm text-admin-ink">
            <input
              type="checkbox"
              checked={form.published === true}
              onChange={(event) => setForm({ ...form, published: event.target.checked })}
            />
            Publish now — an unpublished code applies to nothing
          </label>

          <div className="flex justify-end gap-3 border-t border-admin-line pt-4">
            <AdminButton onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={submit} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? 'Save to WooCommerce' : 'Create in WooCommerce'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
      )}

      {confirmDelete && (
      <AdminModal
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete.code}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-admin-ink">
            The code stops being redeemable immediately. Orders that already used it keep their own record of the
            discount, so no order history is changed by this.
          </p>
          <div className="flex justify-end gap-3">
            <AdminButton onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Keep it
            </AdminButton>
            <AdminButton onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete in WooCommerce
            </AdminButton>
          </div>
        </div>
      </AdminModal>
      )}
    </>
  );
}
