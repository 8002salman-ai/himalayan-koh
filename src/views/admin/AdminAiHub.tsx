'use client';

import { Bot, Cpu, Sparkles, Upload, Wand } from 'lucide-react';
import {
  ADMIN_TD,
  AdminCapabilityPanel,
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminTable,
  AdminTabs,
} from '../../components/admin/AdminUI';
import { Link } from 'react-router-dom';
import { useState } from 'react';

type Tab = 'surfaces' | 'models' | 'limits';

const TABS: { id: Tab; label: string }[] = [
  { id: 'surfaces', label: 'AI surfaces' },
  { id: 'models', label: 'Models' },
  { id: 'limits', label: 'Limits & review' },
];

/**
 * The AI surfaces this application actually has, read from the code rather than
 * promised. A surface with no module behind it is not listed here.
 */
const SURFACES = [
  {
    name: 'Customer assistant',
    where: '/api/openrouter',
    what: 'Answers storefront questions about products, livestock salt use and orders.',
    state: 'Wired',
    note: 'Server-side key, rate limited, safe answers only — no veterinary diagnosis.',
  },
  {
    name: 'SEO suggestions',
    where: '/admin/seo',
    what: 'Titles, meta descriptions, alt text, internal links and content gaps.',
    state: 'Needs a model key',
    note: 'Suggestions are reviewed and applied by hand; nothing is published automatically.',
  },
  {
    name: 'Listing copy',
    where: '/admin/marketing',
    what: 'Product descriptions and campaign copy from the product facts.',
    state: 'Needs a model key',
    note: 'Drafts only — a generated description is edited before it is saved.',
  },
  {
    name: 'Import research',
    where: '/admin/ai-import',
    what: 'Reads a supplier page and drafts a listing from it.',
    state: 'Needs a model key',
    note: 'The draft is created in WooCommerce as a draft, never live.',
  },
];

/**
 * AI Hub — what the store's AI can do, where each surface lives, and what is
 * still missing.
 *
 * The screen deliberately does not print a key status: the console is a browser
 * client and the keys are server-only, so any "connected" badge here would be
 * either a guess or a leak. It lists the surfaces that exist and states what each
 * needs, and the model list is a configuration placeholder rather than a claim
 * about which model is billed.
 */
export default function AdminAiHub() {
  const [tab, setTab] = useState<Tab>('surfaces');
  const wired = SURFACES.filter((surface) => surface.state === 'Wired').length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="AI Hub"
        description="Every AI surface in this store, what it does with your catalog, and what a person still has to decide."
        actions={<AdminPendingChip label="Model key required" />}
      />

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'surfaces' && (
        <>
          <AdminPanel
            title="Surfaces"
            description={`${wired} of ${SURFACES.length} wired today — the rest are built and waiting on a server-side key`}
          >
            <AdminTable
              columns={[
                { key: 'name', label: 'Surface' },
                { key: 'what', label: 'What it does' },
                { key: 'state', label: 'State', align: 'right' },
              ]}
              minWidth="900px"
            >
              {SURFACES.map((surface) => (
                <tr key={surface.name}>
                  <td className={ADMIN_TD}>
                    <div className="flex items-center gap-2.5">
                      <Bot size={16} className="text-admin-muted" />
                      <div>
                        <p className="font-medium text-admin-ink">{surface.name}</p>
                        <p className="font-mono text-[11px] text-admin-muted">{surface.where}</p>
                      </div>
                    </div>
                  </td>
                  <td className={ADMIN_TD}>
                    <p className="text-admin-ink">{surface.what}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">{surface.note}</p>
                  </td>
                  <td className={`${ADMIN_TD} text-right`}>
                    {surface.state === 'Wired' ? (
                      <AdminChip tone="success">Wired</AdminChip>
                    ) : (
                      <AdminChip tone="warning">{surface.state}</AdminChip>
                    )}
                  </td>
                </tr>
              ))}
            </AdminTable>
          </AdminPanel>

          <AdminPanel title="Where to work" description="Each surface has one home screen">
            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin/seo"
                className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
              >
                <Sparkles size={15} /> SEO Engine
              </Link>
              <Link
                to="/admin/marketing"
                className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
              >
                <Wand size={15} /> Marketing Gen
              </Link>
              <Link
                to="/admin/ai-import"
                className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
              >
                <Upload size={15} /> AI Import
              </Link>
              <Link
                to="/admin/ai-control"
                className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
              >
                <Cpu size={15} /> AI Control
              </Link>
            </div>
          </AdminPanel>
        </>
      )}

      {tab === 'models' && (
        <AdminCapabilityPanel
          title="Models"
          summary="Which model answers for each surface, and what it costs per thousand tokens."
          capabilities={['ai-text', 'ai-vision']}
          available={[
            'The customer assistant already picks a model server-side with a fallback chain, so a model change is a server change, not a client one.',
            'The console shows no model price rather than an approximate one — rates change and a stale number would be worse than none.',
          ]}
        />
      )}

      {tab === 'limits' && (
        <>
          <AdminPanel title="Rules every AI surface follows" description="Applied in code, not by convention">
            <ul className="space-y-2 text-sm text-admin-ink">
              <li>Keys stay server-side. No <code>NEXT_PUBLIC</code> key is ever used for a model.</li>
              <li>Generated text is a suggestion. A person applies it; nothing auto-publishes.</li>
              <li>Product facts are read from the catalog — a model is never asked to invent a price, SKU or stock level.</li>
              <li>Customer-facing answers avoid veterinary diagnosis and defer to a professional.</li>
            </ul>
          </AdminPanel>

          <AdminNotice tone="info" title="Why a key status is not shown here">
            The browser cannot read a server-only key, so a green “connected” badge would be an
            assumption. The surfaces above name what they need instead, and a real probe belongs on a
            server route that holds the credential.
          </AdminNotice>
        </>
      )}
    </div>
  );
}
