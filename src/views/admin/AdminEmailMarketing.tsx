'use client';

import { useState } from 'react';
import { Mail, Send, Users } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminStatTile,
  AdminTable,
  AdminTabs,
  AdminTextarea,
} from '../../components/admin/AdminUI';

type Tab = 'campaigns' | 'subscribers' | 'templates';

const TABS: { id: Tab; label: string }[] = [
  { id: 'campaigns', label: 'Campaign mail' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'templates', label: 'Templates' },
];

/**
 * The transactional mail this store already sends, named from the code that
 * sends it. Listed here so nobody re-writes a receipt that exists.
 */
const TRANSACTIONAL = [
  { name: 'Order confirmation', trigger: 'Payment received', to: 'Buyer' },
  { name: 'Payment received', trigger: 'Payment received', to: 'Store' },
  { name: 'Shipped', trigger: 'Label created', to: 'Buyer' },
];

/**
 * Email Marketing.
 *
 * Sending is what this screen is for, and sending is the thing that is not
 * connected: preflight, plus a verified sending domain. So the composer is real
 * — it holds copy and shows the merge fields it will use — while the send and the
 * subscriber list state what they need. Bulk mail is never simulated: a fake
 * send would leave someone believing a campaign went out.
 */
export default function AdminEmailMarketing() {
  const [tab, setTab] = useState<Tab>('campaigns');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Marketing"
        title="Email Marketing"
        description="Campaign mail to the store's own list, on the store's own domain."
        actions={<AdminPendingChip label="Sending not connected" />}
      />

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile label="Subscribers" icon={Users} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Sent (30 days)" icon={Send} tone="slate" unavailable="Not connected" />
        <AdminStatTile label="Open rate" icon={Mail} tone="slate" unavailable="Not connected" />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'campaigns' && (
        <>
          <AdminPanel
            title="Compose"
            description="Copy is written here; sending is queued until the sending domain is verified"
          >
            <AdminField label="Subject">
              <AdminInput
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Restock: 5 lb cattle salt back in"
              />
            </AdminField>
            <AdminField label="Body" className="mt-4">
              <AdminTextarea
                rows={6}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the message. {{first_name}} and {{store_name}} are the only merge fields available."
              />
            </AdminField>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-admin-line pt-4">
              <p className="text-xs text-admin-muted">
                {subject.trim() ? `${subject.trim().length}-character subject.` : 'No subject yet.'}{' '}
                Nothing is queued until sending is connected.
              </p>
              <button
                type="button"
                disabled
                title="Sending needs RESEND_API_KEY and a verified sending domain"
                className="inline-flex items-center gap-2 rounded-xl bg-himalayan px-4 py-2.5 text-sm font-semibold text-white opacity-50"
              >
                <Send size={16} />
                Queue campaign
              </button>
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Sending and the subscriber list"
            summary="Deliverability, the list itself, and unsubscribe handling for campaign mail."
            capabilities={['email-send']}
            available={[
              'The storefront already collects addresses through /api/newsletter, idempotently, so a re-subscribe does not duplicate a person.',
              'Transactional order mail is already implemented and shares the same provider as campaign mail will.',
            ]}
          />
        </>
      )}

      {tab === 'subscribers' && (
        <AdminCapabilityPanel
          title="Subscribers"
          summary="Addresses, the source they came from, and when they joined."
          capabilities={['email-send']}
          available={[
            'Signups are stored with the source page they came from, so a segment can be honest about where a person opted in.',
            'No subscriber count is shown until the list is readable — a guessed list size is how a campaign gets sent to nobody.',
          ]}
        />
      )}

      {tab === 'templates' && (
        <>
          <AdminPanel
            title="Transactional mail already in place"
            description="Sent by the store today; campaign mail reuses the same layout"
          >
            <AdminTable
              columns={[
                { key: 'name', label: 'Email' },
                { key: 'trigger', label: 'Trigger' },
                { key: 'to', label: 'Recipient' },
              ]}
              minWidth="720px"
            >
              {TRANSACTIONAL.map((item) => (
                <tr key={item.name}>
                  <td className={`${ADMIN_TD} font-medium text-admin-ink`}>{item.name}</td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{item.trigger}</td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{item.to}</td>
                </tr>
              ))}
            </AdminTable>
          </AdminPanel>

          <AdminNotice tone="info" title="One layout, one voice">
            Campaign mail is not given a separate design system. It uses the order-mail layout so a
            customer recognises the sender, and the sender address is the same verified domain.
          </AdminNotice>

          <div className="flex flex-wrap gap-2">
            <AdminChip tone="muted">Unsubscribe link required</AdminChip>
            <AdminChip tone="muted">Physical address required</AdminChip>
            <AdminChip tone="muted">No purchased lists</AdminChip>
            <AdminChip tone="muted">Double opt-in for the newsletter</AdminChip>
          </div>
        </>
      )}
    </div>
  );
}
