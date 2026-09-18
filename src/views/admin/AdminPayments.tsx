'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminFact,
  AdminFacts,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTable,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { getErrorMessage } from '../../lib/errors';

type Tab = 'stripe' | 'gateways' | 'tax';

const TABS: { id: Tab; label: string }[] = [
  { id: 'stripe', label: 'Card payments' },
  { id: 'gateways', label: 'WooCommerce gateways' },
  { id: 'tax', label: 'Tax' },
];

interface StripeStatus {
  configured: boolean;
  mode: 'live' | 'test';
  webhookConfigured: boolean;
}

/**
 * Payments.
 *
 * Card configuration is the one commerce fact this console can read without the
 * WooCommerce key, because the store's own Stripe config route reports whether a
 * publishable + secret pair exists and which mode the secret belongs to — and it
 * reports no key material back. Everything else about payments is a WooCommerce
 * gateway record, so it states that rather than listing gateways it cannot see.
 *
 * This screen never places a charge and never shows a secret: the mode is the
 * only credential-derived fact displayed.
 */
export default function AdminPayments() {
  const [tab, setTab] = useState<Tab>('stripe');
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/config', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Stripe config returned ${response.status}`);
      const data = (await response.json()) as {
        configured?: boolean;
        mode?: string;
        webhookConfigured?: boolean;
      };
      setStatus({
        configured: Boolean(data.configured),
        mode: data.mode === 'live' ? 'live' : 'test',
        webhookConfigured: Boolean(data.webhookConfigured),
      });
    } catch (err) {
      setStatus(null);
      setError(getErrorMessage(err, 'Unable to read the payment configuration.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="System"
        title="Payments"
        description="How the store takes money: card provider, WooCommerce gateways and tax handling."
        actions={
          <>
            <AdminPendingChip label="Gateways need WooCommerce read" />
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
            >
              <RefreshCw size={16} />
              Re-check
            </button>
          </>
        }
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read the payment configuration">
          {error}
        </AdminNotice>
      )}

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile
          label="Card payments"
          icon={CreditCard}
          tone={status?.configured ? 'green' : 'amber'}
          value={loading ? '—' : status?.configured ? 'Configured' : 'Not configured'}
        />
        <AdminStatTile
          label="Mode"
          icon={ShieldCheck}
          tone={status?.mode === 'live' ? 'green' : 'brand'}
          value={loading ? '—' : status?.mode === 'live' ? 'Live' : 'Test'}
        />
        <AdminStatTile
          label="Webhook"
          icon={ShieldCheck}
          tone={status?.webhookConfigured ? 'green' : 'amber'}
          value={loading ? '—' : status?.webhookConfigured ? 'Subscribed' : 'Not subscribed'}
        />
      </div>

      {status?.mode === 'live' && (
        <AdminNotice tone="warning" title="This deployment is holding live card keys">
          A live secret is configured. Nothing in this console creates a charge, and payment tests
          must run against the staging store instead.
        </AdminNotice>
      )}

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'stripe' && (
        <AdminPanel
          title="Card provider"
          description="Read from this deployment's own configuration route — no key material is returned"
        >
          <AdminFacts>
            <AdminFact label="Provider">Stripe</AdminFact>
            <AdminFact label="Secret key present">{status?.configured ? 'Yes' : 'No'}</AdminFact>
            <AdminFact label="Mode">
              {status ? (status.mode === 'live' ? 'Live keys' : 'Test keys') : 'Unknown'}
            </AdminFact>
            <AdminFact label="Webhook secret">
              {status?.webhookConfigured ? 'Present' : 'Missing'}
            </AdminFact>
            <AdminFact label="Where it is set">Admin → Settings, or the deployment’s environment</AdminFact>
          </AdminFacts>
          <p className="mt-4 text-xs text-admin-muted">
            The publishable key is not shown: it is public, but displaying it here would add nothing
            and invites a screenshot with a half-configured pair.
          </p>
        </AdminPanel>
      )}

      {tab === 'gateways' && (
        <AdminCapabilityPanel
          title="WooCommerce gateways"
          summary="Which gateways checkout offers, in what order, and their enabled state."
          capabilities={['woo-rest-read']}
          available={[
            'Card payment status above is already real, so the screen is useful before the gateway list is readable.',
          ]}
        />
      )}

      {tab === 'tax' && (
        <AdminPanel title="Tax" description="How tax is applied to a sale">
          <AdminTable
            columns={[
              { key: 'scope', label: 'Scope' },
              { key: 'owner', label: 'Owner' },
              { key: 'state', label: 'State', align: 'right' },
            ]}
            minWidth="720px"
          >
            <tr>
              <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Store tax rates</td>
              <td className={`${ADMIN_TD} text-admin-muted`}>WooCommerce</td>
              <td className={`${ADMIN_TD} text-right`}>
                <AdminChip tone="warning">Not connected</AdminChip>
              </td>
            </tr>
            <tr>
              <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Display prices inclusive</td>
              <td className={`${ADMIN_TD} text-admin-muted`}>WooCommerce setting</td>
              <td className={`${ADMIN_TD} text-right`}>
                <AdminChip tone="warning">Not connected</AdminChip>
              </td>
            </tr>
          </AdminTable>
          <p className="px-5 py-4 text-sm text-admin-muted">
            Tax is deliberately not modelled in the console. A rate duplicated here would be a second
            authority for what a customer is charged, and the two would disagree at the first filing.
          </p>
        </AdminPanel>
      )}

      <AdminCapabilityPanel
        title="Order payment state"
        summary="Whether an order is paid, refunded or failed, and the transaction it belongs to."
        capabilities={['woo-rest-read']}
      />
    </div>
  );
}
