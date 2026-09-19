'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Megaphone, Percent, RefreshCw, Save, Send, Trash2, Ticket } from 'lucide-react';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTable,
  AdminTableSkeleton,
  AdminTabs,
  AdminTextarea,
} from '../../components/admin/AdminUI';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';
import {
  deleteCampaign,
  fetchAdminCoupons,
  fetchCampaigns,
  saveCampaign,
  type AdminCampaign,
  type AdminCoupon,
  type CampaignStatus,
} from '../../lib/admin/consoleApi';
import { getErrorMessage } from '../../lib/errors';

type Tab = 'campaigns' | 'editor' | 'calendar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'editor', label: 'Draft a campaign' },
  { id: 'calendar', label: 'Schedule' },
];

const STATUS_TONES: Record<CampaignStatus, 'muted' | 'info' | 'success' | 'warning'> = {
  draft: 'muted',
  ready: 'info',
  scheduled: 'info',
  running: 'success',
  completed: 'muted',
  cancelled: 'warning',
};

interface DraftState {
  id: string | null;
  name: string;
  goal: string;
  audience: string;
  brief: string;
  startsAt: string;
  endsAt: string;
  productIds: number[];
  couponCode: string;
}

const EMPTY_DRAFT: DraftState = {
  id: null,
  name: '',
  goal: '',
  audience: '',
  brief: '',
  startsAt: '',
  endsAt: '',
  productIds: [],
  couponCode: '',
};

/**
 * Campaigns.
 *
 * A campaign is a plan, so it is stored as application data — one row per campaign
 * in the app's own settings store — and never as a discount. Coupons stay in
 * WooCommerce and are *referenced* here; the reference is checked against the store
 * when a campaign is asked to become ready, so a campaign cannot point at a code
 * that will never apply.
 *
 * Status is earned: **draft** is where everything starts, and **ready** requires a
 * name, a goal, an audience, a brief and at least one product. Scheduling,
 * running and completion are derived from the dates once a campaign is ready, so
 * the calendar cannot disagree with the record.
 *
 * Sending is Resend's. It is not configured on this deployment, so the button is
 * disabled and the reason is on screen — and nothing anywhere claims a mail went
 * out.
 */
export default function AdminCampaigns() {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [sendBlocker, setSendBlocker] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [problemList, setProblemList] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const { rows, loading: catalogLoading, error: catalogError } = useAdminCatalog({
    sort: 'name',
    search: productSearch || undefined,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, couponList] = await Promise.all([
        fetchCampaigns(),
        fetchAdminCoupons().catch(() => [] as AdminCoupon[]),
      ]);
      setCampaigns(list.campaigns);
      setSendBlocker(list.sendBlocker);
      setCoupons(couponList);
    } catch (err) {
      setCampaigns([]);
      setError(getErrorMessage(err, 'Campaigns could not be read.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const by = (status: CampaignStatus) => campaigns.filter((campaign) => campaign.status === status).length;
    return {
      total: campaigns.length,
      draft: by('draft'),
      running: by('running'),
      ready: by('ready') + by('scheduled'),
    };
  }, [campaigns]);

  const openEdit = (campaign: AdminCampaign) => {
    setDraft({
      id: campaign.id,
      name: campaign.name,
      goal: campaign.goal,
      audience: campaign.audience,
      brief: campaign.brief,
      startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 10) : '',
      endsAt: campaign.endsAt ? campaign.endsAt.slice(0, 10) : '',
      productIds: campaign.productIds,
      couponCode: campaign.couponCode ?? '',
    });
    setProblemList([]);
    setFormError(null);
    setTab('editor');
  };

  const submit = async (status: CampaignStatus) => {
    setSaving(true);
    setFormError(null);
    setProblemList([]);
    try {
      const result = await saveCampaign({
        id: draft.id ?? undefined,
        name: draft.name,
        goal: draft.goal,
        audience: draft.audience,
        brief: draft.brief,
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
        productIds: draft.productIds,
        couponCode: draft.couponCode || null,
        status,
      });
      setDraft((current) => ({ ...current, id: result.campaign.id }));
      setNotice(
        status === 'ready'
          ? `"${result.campaign.name}" is ready${result.campaign.startsAt ? ` and scheduled from ${result.campaign.startsAt.slice(0, 10)}` : ''}.`
          : `"${result.campaign.name}" was saved as a draft.`
      );
      await load();
    } catch (err) {
      const message = getErrorMessage(err, 'The campaign could not be saved.');
      setFormError(message);
      setProblemList([]);
      // The server lists every reason a campaign is not ready in one message; show
      // it whole rather than trimming it to the first problem.
      if (message.includes('not ready:')) {
        setProblemList(
          message
            .replace(/^.*not ready:\s*/, '')
            .split(/(?<=\.)\s+/)
            .filter(Boolean)
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (campaign: AdminCampaign) => {
    try {
      await deleteCampaign(campaign.id);
      setNotice(`"${campaign.name}" was deleted. A discarded draft is not kept.`);
      if (draft.id === campaign.id) setDraft(EMPTY_DRAFT);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'The campaign could not be deleted.'));
    }
  };

  const toggleProduct = (id: number) => {
    setDraft((current) => ({
      ...current,
      productIds: current.productIds.includes(id)
        ? current.productIds.filter((entry) => entry !== id)
        : [...current.productIds, id],
    }));
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Campaigns"
        description="Plans, audiences and schedules — drafted and validated here, pointing at the real catalog and real coupons."
        actions={
          <AdminButton icon={RefreshCw} onClick={load} disabled={loading}>
            Refresh
          </AdminButton>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Campaigns could not be read">
          {error}
        </AdminNotice>
      )}
      {notice && (
        <AdminNotice
          tone="info"
          title="Saved"
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
      {sendBlocker && (
        <AdminNotice tone="warning" title="Campaign email cannot be sent from this deployment">
          {sendBlocker}
        </AdminNotice>
      )}

      <div className="grid grid-cols-4 gap-4">
        <AdminStatTile
          label="Campaigns on record"
          icon={Megaphone}
          tone="brand"
          value={loading ? undefined : counts.total}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Drafts"
          icon={Percent}
          tone="slate"
          value={loading ? undefined : counts.draft}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Ready or scheduled"
          icon={CalendarClock}
          tone={counts.ready > 0 ? 'green' : 'slate'}
          value={loading ? undefined : counts.ready}
          unavailable={loading ? 'Reading…' : undefined}
        />
        <AdminStatTile
          label="Running now"
          icon={Megaphone}
          tone={counts.running > 0 ? 'green' : 'slate'}
          value={loading ? undefined : counts.running}
          unavailable={loading ? 'Reading…' : undefined}
        />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'campaigns' && (
        <AdminPanel
          title="Campaigns"
          description="Drafts persist in the app's own settings store — one row per campaign, no second catalogue."
          action={<AdminChip tone="neutral">{campaigns.length} on record</AdminChip>}
        >
          <AdminTable
            columns={[
              { key: 'name', label: 'Campaign' },
              { key: 'goal', label: 'Goal' },
              { key: 'schedule', label: 'Schedule' },
              { key: 'status', label: 'Status', align: 'right' },
              { key: 'actions', label: '', align: 'right' },
            ]}
          >
            {loading ? (
              <AdminTableSkeleton rows={4} columns={5} />
            ) : campaigns.length === 0 ? (
              <tr>
                <td className={ADMIN_TD} colSpan={5}>
                  <p className="py-10 text-center text-sm text-admin-muted">
                    No campaigns yet. Draft one on the next tab — it saves before it is ready.
                  </p>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className={ADMIN_TD}>
                    <p className="font-semibold text-admin-ink">{campaign.name}</p>
                    <p className="text-[11px] text-admin-muted">
                      {campaign.productIds.length} product{campaign.productIds.length === 1 ? '' : 's'}
                      {campaign.couponCode ? ` · coupon ${campaign.couponCode}` : ''}
                    </p>
                  </td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{campaign.goal || 'No goal set'}</td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>
                    {campaign.startsAt
                      ? `${campaign.startsAt.slice(0, 10)} → ${campaign.endsAt ? campaign.endsAt.slice(0, 10) : 'open'}`
                      : 'No schedule'}
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>
                    <AdminChip tone={STATUS_TONES[campaign.status]}>{campaign.status}</AdminChip>
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>
                    <div className="flex justify-end gap-2">
                      <AdminButton onClick={() => openEdit(campaign)}>Open</AdminButton>
                      <AdminButton icon={Trash2} onClick={() => remove(campaign)}>
                        Delete
                      </AdminButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </AdminTable>
        </AdminPanel>
      )}

      {tab === 'editor' && (
        <>
          <AdminPanel
            title={draft.id ? 'Edit campaign' : 'Draft a campaign'}
            description="Saved to the app's own store. Nothing here changes a price, creates a coupon, or sends anything."
          >
            {formError && (
              <AdminNotice tone="danger" title="Not saved">
                <p>{formError}</p>
                {problemList.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {problemList.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </AdminNotice>
            )}

            <div className="grid grid-cols-2 gap-5">
              <AdminField label="Campaign name">
                <AdminInput
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="e.g. Spring salt block restock"
                />
              </AdminField>
              <AdminField label="Goal" hint="What this campaign is for">
                <AdminInput
                  value={draft.goal}
                  onChange={(event) => setDraft({ ...draft, goal: event.target.value })}
                  placeholder="e.g. Clear the 8×4×1 salt block stock"
                />
              </AdminField>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-5">
              <AdminField label="Audience" hint="Who it is aimed at">
                <AdminInput
                  value={draft.audience}
                  onChange={(event) => setDraft({ ...draft, audience: event.target.value })}
                  placeholder="e.g. Repeat buyers in Texas"
                />
              </AdminField>
              <AdminField label="Starts" hint="Leave empty to keep it unscheduled">
                <AdminInput
                  type="date"
                  value={draft.startsAt}
                  onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
                />
              </AdminField>
              <AdminField label="Ends">
                <AdminInput
                  type="date"
                  value={draft.endsAt}
                  onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })}
                />
              </AdminField>
            </div>

            <AdminField label="Brief" className="mt-5" hint="Offer, channel and the dates it should run">
              <AdminTextarea
                rows={3}
                value={draft.brief}
                onChange={(event) => setDraft({ ...draft, brief: event.target.value })}
                placeholder="What is being offered, where it runs, and what success looks like"
              />
            </AdminField>

            <AdminField
              label="Coupon to reference"
              className="mt-5"
              hint="Optional. Must already exist in WooCommerce — create it on the Coupons screen."
            >
              <select
                value={draft.couponCode}
                onChange={(event) => setDraft({ ...draft, couponCode: event.target.value })}
                className="w-full max-w-md rounded-xl border border-admin-line bg-admin-surface px-3 py-2.5 text-sm"
              >
                <option value="">No coupon</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.code}>
                    {coupon.code} ({coupon.state})
                  </option>
                ))}
              </select>
            </AdminField>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-admin-line pt-4">
              <p className="text-xs text-admin-muted">
                {draft.productIds.length} product{draft.productIds.length === 1 ? '' : 's'} selected from{' '}
                {catalogSourceLabel()}.
              </p>
              <div className="flex gap-3">
                <AdminButton onClick={() => submit('draft')} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save draft
                </AdminButton>
                <AdminButton variant="primary" onClick={() => submit('ready')} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Mark ready
                </AdminButton>
                <AdminButton
                  disabled
                  title={sendBlocker ?? 'Email sending is not configured'}
                >
                  <Send size={16} />
                  Send
                </AdminButton>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Products this campaign can feature"
            description={`Read live from ${catalogSourceLabel()} — the same catalogue the storefront serves`}
          >
            {catalogError && (
              <AdminNotice tone="warning" title="The catalogue could not be read">
                {catalogError}
              </AdminNotice>
            )}
            <div className="mb-4">
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search the catalogue…"
                aria-label="Search products"
                className="w-full max-w-md rounded-xl border border-admin-line bg-admin-surface px-3 py-2.5 text-sm"
              />
            </div>
            <AdminTable
              columns={[
                { key: 'pick', label: '' },
                { key: 'name', label: 'Product' },
                { key: 'category', label: 'Category' },
                { key: 'price', label: 'Price', align: 'right' },
              ]}
            >
              {catalogLoading ? (
                <AdminTableSkeleton rows={6} columns={4} />
              ) : rows.length === 0 ? (
                <tr>
                  <td className={ADMIN_TD} colSpan={4}>
                    <p className="py-6 text-sm text-admin-muted">
                      The catalogue source reported no product for this search.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.slice(0, 40).map((row) => (
                  <tr key={row.id}>
                    <td className={ADMIN_TD}>
                      <input
                        type="checkbox"
                        checked={draft.productIds.includes(Number(row.id))}
                        onChange={() => toggleProduct(Number(row.id))}
                        aria-label={`Feature ${row.name}`}
                      />
                    </td>
                    <td className={ADMIN_TD}>
                      <span className="font-medium text-admin-ink">{row.name}</span>
                    </td>
                    <td className={`${ADMIN_TD} text-admin-muted`}>{row.categoryName ?? 'Uncategorised'}</td>
                    <td className={`${ADMIN_TD} text-right`}>
                      {row.missing.includes('price') ? (
                        <AdminChip tone="muted">Price unavailable</AdminChip>
                      ) : (
                        <span className="font-semibold text-admin-ink">{row.price}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </AdminTable>
          </AdminPanel>
        </>
      )}

      {tab === 'calendar' && (
        <AdminPanel
          title="Schedule"
          description="Derived from each campaign's own dates: a campaign cannot claim to be running before its window opens."
        >
          <AdminTable
            columns={[
              { key: 'name', label: 'Campaign' },
              { key: 'start', label: 'Starts' },
              { key: 'end', label: 'Ends' },
              { key: 'status', label: 'Now', align: 'right' },
            ]}
          >
            {loading ? (
              <AdminTableSkeleton rows={4} columns={4} />
            ) : campaigns.length === 0 ? (
              <tr>
                <td className={ADMIN_TD} colSpan={4}>
                  <p className="py-8 text-center text-sm text-admin-muted">No campaigns to schedule.</p>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className={ADMIN_TD}>{campaign.name}</td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>
                    {campaign.startsAt ? campaign.startsAt.slice(0, 10) : '—'}
                  </td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>
                    {campaign.endsAt ? campaign.endsAt.slice(0, 10) : '—'}
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>
                    <AdminChip tone={STATUS_TONES[campaign.status]}>{campaign.status}</AdminChip>
                  </td>
                </tr>
              ))
            )}
          </AdminTable>
        </AdminPanel>
      )}

      <AdminPanel title="Where each piece lives" description="One owner per concept">
        <div className="flex items-start gap-3 text-sm text-admin-ink">
          <Ticket size={16} className="mt-0.5 text-admin-muted" />
          <p>
            Coupon codes are created and edited on the{' '}
            <strong>Coupons</strong> screen and applied by WooCommerce at checkout. Price rules belong to
            Promotions. This screen plans the push around them and never becomes a second place to create a
            discount.
          </p>
        </div>
      </AdminPanel>
    </div>
  );
}
