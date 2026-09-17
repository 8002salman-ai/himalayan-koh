'use client';

import { useState } from 'react';
import { Cpu, ShieldCheck, SlidersHorizontal } from 'lucide-react';
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
  AdminTable,
  AdminTabs,
} from '../../components/admin/AdminUI';

type Tab = 'guardrails' | 'roles' | 'log';

const TABS: { id: Tab; label: string }[] = [
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'roles', label: 'Who may use it' },
  { id: 'log', label: 'Usage log' },
];

interface Guardrail {
  id: string;
  label: string;
  detail: string;
  /** Fixed in code — the toggle exists to show it, not to switch it off. */
  locked: boolean;
}

const GUARDRAILS: Guardrail[] = [
  {
    id: 'server-keys',
    label: 'Model keys stay server-side',
    detail: 'No NEXT_PUBLIC model key exists anywhere in the app, so a key cannot leak through a bundle.',
    locked: true,
  },
  {
    id: 'review',
    label: 'Generated content requires review',
    detail: 'Suggestions land in an editor. Applying one is a human click.',
    locked: true,
  },
  {
    id: 'no-metrics',
    label: 'Models never source commerce figures',
    detail: 'Price, SKU and stock come from the catalog adapter only — a model is never asked for a number.',
    locked: true,
  },
  {
    id: 'customer-safety',
    label: 'Customer answers avoid veterinary advice',
    detail: 'The storefront assistant defers health questions to a veterinarian.',
    locked: true,
  },
];

/**
 * AI Control — the limits the store's AI runs under.
 *
 * The guardrails listed here are implemented in code (server-only keys, review
 * before apply, commerce facts from the adapter). They are shown as locked
 * switches rather than editable settings because a console toggle that silently
 * changed them would be the least trustworthy switch on the screen. Anything
 * genuinely configurable is stated as needing the settings write, which is not
 * connected yet.
 */
export default function AdminAiControl() {
  const [tab, setTab] = useState<Tab>('guardrails');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="AI Control"
        description="What the store's AI is allowed to do, who may use it, and what it has been used for."
        actions={<AdminPendingChip label="Settings write required" />}
      />

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'guardrails' && (
        <>
          <AdminPanel
            title="Guardrails"
            description="Enforced in code — shown here so the rule is visible, not so it can be switched off"
          >
            <AdminTable
              columns={[
                { key: 'rule', label: 'Rule' },
                { key: 'detail', label: 'What it means' },
                { key: 'state', label: 'State', align: 'right' },
              ]}
              minWidth="880px"
            >
              {GUARDRAILS.map((guardrail) => (
                <tr key={guardrail.id}>
                  <td className={ADMIN_TD}>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={15} className="text-admin-muted" />
                      <span className="font-medium text-admin-ink">{guardrail.label}</span>
                    </div>
                  </td>
                  <td className={`${ADMIN_TD} text-admin-muted`}>{guardrail.detail}</td>
                  <td className={`${ADMIN_TD} text-right`}>
                    <AdminChip tone="success">Enforced</AdminChip>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </AdminPanel>

          <AdminPanel title="Spend ceiling" description="Not yet enforced anywhere — stated so it is not assumed">
            <div className="grid grid-cols-2 gap-5">
              <AdminField label="Monthly generation ceiling" hint="Free-text until a usage source exists">
                <AdminInput
                  value={monthlyLimit}
                  onChange={(event) => setMonthlyLimit(event.target.value)}
                  placeholder="Not set"
                />
              </AdminField>
              <div className="flex items-end">
                <p className="text-sm text-admin-muted">
                  A ceiling needs a usage record, which needs the model key. Until then the console
                  does not pretend a limit is in force.
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Saving control settings"
            summary="Persisting the ceiling and the per-surface switches for this store."
            capabilities={['ai-text']}
            available={[
              'The guardrails themselves are code, so they hold whether or not settings are saved.',
              'Settings live in the store’s own settings table, alongside the Stripe and email values already stored there.',
            ]}
          />
        </>
      )}

      {tab === 'roles' && (
        <AdminPanel title="Surfaces by role" description="Who sees generation controls at all">
          <AdminTable
            columns={[
              { key: 'surface', label: 'Surface' },
              { key: 'roles', label: 'Roles with access' },
            ]}
            minWidth="640px"
          >
            <tr>
              <td className={`${ADMIN_TD} font-medium text-admin-ink`}>SEO suggestions</td>
              <td className={`${ADMIN_TD} text-admin-muted`}>Admin, Manager, Marketing</td>
            </tr>
            <tr>
              <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Listing copy</td>
              <td className={`${ADMIN_TD} text-admin-muted`}>Admin, Manager</td>
            </tr>
            <tr>
              <td className={`${ADMIN_TD} font-medium text-admin-ink`}>AI Import</td>
              <td className={`${ADMIN_TD} text-admin-muted`}>Admin only</td>
            </tr>
            <tr>
              <td className={`${ADMIN_TD} font-medium text-admin-ink`}>Customer assistant</td>
              <td className={`${ADMIN_TD} text-admin-muted`}>Public, rate limited</td>
            </tr>
          </AdminTable>
          <p className="px-5 py-4 text-sm text-admin-muted">
            Roles are enforced by the admin guard on the route, not by hiding a button: a control that
            is only hidden is still reachable.
          </p>
        </AdminPanel>
      )}

      {tab === 'log' && (
        <AdminCapabilityPanel
          title="Usage log"
          summary="Which surface generated what, for whom, and when — the audit trail for a suggestion that was applied."
          capabilities={['ai-text']}
          available={[
            'Nothing is logged today, which is why the table is empty rather than populated with plausible-looking rows.',
          ]}
        />
      )}

      <AdminNotice tone="info" title="Why the switches are locked">
        A guardrail that a console can turn off is a guardrail that will be turned off during a busy
        week. Making these read-only here means changing one is a code change with a review — the
        right amount of friction for a rule about not inventing a price.
      </AdminNotice>

      <div className="flex flex-wrap gap-2">
        <AdminChip tone="muted">
          <Cpu size={11} /> Server-side keys
        </AdminChip>
        <AdminChip tone="muted">
          <SlidersHorizontal size={11} /> Per-surface switches
        </AdminChip>
      </div>
    </div>
  );
}
