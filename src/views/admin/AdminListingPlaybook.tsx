'use client';

import { CheckCircle2, Circle, ClipboardList, BookOpen } from 'lucide-react';
import { useState } from 'react';
import {
  AdminChip,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminStatTile,
  AdminTabs,
} from '../../components/admin/AdminUI';

type Tab = 'checklist' | 'standards' | 'voice';

const TABS: { id: Tab; label: string }[] = [
  { id: 'checklist', label: 'Publish checklist' },
  { id: 'standards', label: 'Listing standards' },
  { id: 'voice', label: 'Voice & claims' },
];

interface Step {
  id: string;
  label: string;
  detail: string;
}

const CHECKLIST: Step[] = [
  { id: 'facts', label: 'Facts before copy', detail: 'Weight, dimensions, origin and use are recorded before a description is written.' },
  { id: 'title', label: 'Title says what it is', detail: 'Product, size and animal or use, in that order — no keyword stuffing.' },
  { id: 'price', label: 'Price covers landed cost', detail: 'Set only after the inbound cost is known, never to match a competitor by default.' },
  { id: 'stock', label: 'Stock and SKU set', detail: 'A SKU that will still make sense on a reorder, and a stock state that is true.' },
  { id: 'images', label: 'Images show the product', detail: 'The actual item and its packaging; no stock photography that misrepresents size.' },
  { id: 'seo', label: 'SEO fields reviewed', detail: 'Title and meta description written for a person, keywords taken from the product.' },
  { id: 'claims', label: 'Claims checked', detail: 'Health and livestock claims are factual and within what the product is sold for.' },
  { id: 'review', label: 'Second pair of eyes', detail: 'Someone who did not write the listing reads it before it is published.' },
];

/**
 * Listing Playbook — the store's own standard for a listing.
 *
 * This is the internal counterpart to the Listing Task queue: the queue says
 * which products are not ready, and this says what "ready" means and in what
 * order the work is done. The checklist state is per-session deliberately — it is
 * a working aid, not a record, and pretending to persist it would create a second
 * source of truth about a listing's progress next to WooCommerce's own status.
 */
export default function AdminListingPlaybook() {
  const [tab, setTab] = useState<Tab>('checklist');
  const [done, setDone] = useState<Record<string, boolean>>({});

  const completed = CHECKLIST.filter((step) => done[step.id]).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="System"
        title="Listing Playbook"
        description="How a Himalayan Koh listing is written and checked, so two products never read like two different stores."
        actions={<AdminChip tone="neutral">Reference</AdminChip>}
      />

      <div className="grid grid-cols-3 gap-4">
        <AdminStatTile label="Steps in the checklist" icon={ClipboardList} tone="brand" value={CHECKLIST.length} />
        <AdminStatTile
          label="Checked in this session"
          icon={CheckCircle2}
          tone={completed === CHECKLIST.length ? 'green' : 'brand'}
          value={`${completed} / ${CHECKLIST.length}`}
        />
        <AdminStatTile label="Where the queue lives" icon={BookOpen} tone="brand" value="Listing Task" hint="/admin/listing-task" />
      </div>

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'checklist' && (
        <>
          <AdminPanel
            title="Publish checklist"
            description="Tick as you go — this is a working aid for one session, not a saved record"
          >
            <ul className="divide-y divide-admin-line">
              {CHECKLIST.map((step) => {
                const isDone = Boolean(done[step.id]);
                return (
                  <li key={step.id} className="flex items-start gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => setDone((current) => ({ ...current, [step.id]: !isDone }))}
                      aria-pressed={isDone}
                      className="mt-0.5 text-admin-muted transition-colors hover:text-himalayan-dark"
                    >
                      {isDone ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isDone ? 'text-admin-muted line-through' : 'text-admin-ink'}`}>
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-admin-muted">{step.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </AdminPanel>

          <AdminNotice tone="info" title="Why the ticks are not saved">
            A listing&apos;s real progress is its WooCommerce status and the fields it actually has —
            which is exactly what the Listing Task queue reads. A saved checklist alongside that would
            be a second opinion about the same product, and the two would disagree on a bad day.
          </AdminNotice>
        </>
      )}

      {tab === 'standards' && (
        <AdminPanel title="Listing standards" description="The rules a product page is held to">
          <ul className="space-y-2.5 text-sm text-admin-ink">
            <li>
              <strong>Weight and size are stated.</strong> Salt is sold by weight, and a listing that
              hides it produces a support message on every order.
            </li>
            <li>
              <strong>One product per listing.</strong> Bundle variants are separate products or real
              variations, never a title that lists three sizes.
            </li>
            <li>
              <strong>Category reflects where a customer would look</strong>, not how the producer
              classifies it internally.
            </li>
            <li>
              <strong>Images are of the item shipped.</strong> If packaging changed, the image changes.
            </li>
            <li>
              <strong>Descriptions are the store&apos;s own words.</strong> Supplier copy is a source
              of facts, not text to paste.
            </li>
          </ul>
        </AdminPanel>
      )}

      {tab === 'voice' && (
        <>
          <AdminPanel title="Voice" description="How the store writes">
            <ul className="space-y-2.5 text-sm text-admin-ink">
              <li>Plain, specific, no superlatives that cannot be checked.</li>
              <li>Animal and food use described by what the product is, not by a promised outcome.</li>
              <li>No invented certifications, awards, review counts or customer quotes.</li>
              <li>Prices, stock and shipping times are never written into body copy — they change.</li>
            </ul>
          </AdminPanel>

          <AdminPanel title="Claims that need checking before publish" description="Kept short on purpose">
            <div className="flex flex-wrap gap-2">
              <AdminChip tone="warning">Health or veterinary benefit</AdminChip>
              <AdminChip tone="warning">Food-grade certification</AdminChip>
              <AdminChip tone="warning">Origin or purity claim</AdminChip>
              <AdminChip tone="warning">Any “best” or “number one”</AdminChip>
            </div>
            <p className="mt-4 text-sm text-admin-muted">
              Each of these needs a document behind it. Until one exists, the listing describes the
              product without the claim.
            </p>
          </AdminPanel>
        </>
      )}
    </div>
  );
}
