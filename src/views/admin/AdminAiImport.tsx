'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Globe, Sparkles, Upload } from 'lucide-react';
import {
  AdminCapabilityPanel,
  AdminChip,
  AdminField,
  AdminInput,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminPendingChip,
  AdminTabs,
} from '../../components/admin/AdminUI';

type Step = 'url' | 'research' | 'draft' | 'publish';

const STEPS: { id: Step; label: string }[] = [
  { id: 'url', label: '1. Source URL' },
  { id: 'research', label: '2. Research' },
  { id: 'draft', label: '3. Draft listing' },
  { id: 'publish', label: '4. Publish' },
];

/**
 * Validates the pasted URL the way an importer must: absolute http(s), a real
 * host, and not this store (importing from yourself is always a mistake).
 */
function inspectUrl(raw: string): { ok: boolean; message: string; host?: string } {
  const value = raw.trim();
  if (!value) return { ok: false, message: 'Paste the product URL to start.' };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, message: 'That is not a complete URL — include https://.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, message: 'Only http and https URLs can be imported.' };
  }
  if (/(^|\.)himalayankoh\.com$/i.test(url.hostname)) {
    return { ok: false, message: 'That is this store. Import is for a supplier or market listing.' };
  }
  return { ok: true, message: `Will read ${url.hostname}`, host: url.hostname };
}

/**
 * AI Import.
 *
 * The one thing this screen can honestly do before the AI layer is connected is
 * validate the source: whether the pasted address is a readable product page and
 * not the store's own. That check is deterministic and runs for real, so the
 * first step of the workflow is genuinely usable — and the rest states exactly
 * what it will do rather than showing invented research.
 */
export default function AdminAiImport() {
  const [step, setStep] = useState<Step>('url');
  const [source, setSource] = useState('');
  const [touched, setTouched] = useState(false);

  const inspection = useMemo(() => inspectUrl(source), [source]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="AI Import"
        description="Paste a product URL and build a listing from it — research, copy, images and SEO, reviewed before anything is saved."
        actions={<AdminPendingChip label="AI model not connected" />}
      />

      <AdminTabs tabs={STEPS} active={step} onChange={setStep} />

      {step === 'url' && (
        <>
          <AdminPanel
            title="Where the product comes from"
            description="Supplier page, market listing or a competitor's product page"
          >
            <AdminField label="Product URL" hint="Absolute http(s) address">
              <AdminInput
                value={source}
                onChange={(event) => setSource(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="https://supplier.example/products/himalayan-salt-lick"
              />
            </AdminField>

            {(touched || source.length > 0) && (
              <div className="mt-4">
                {inspection.ok ? (
                  <AdminNotice tone="info" title="Source looks importable">
                    {inspection.message}. The next step fetches the page and drafts the listing; the
                    draft is never published by itself.
                  </AdminNotice>
                ) : (
                  <AdminNotice tone="warning" title="Cannot use this URL">
                    {inspection.message}
                  </AdminNotice>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-admin-line pt-4">
              <p className="text-xs text-admin-muted">
                Research, drafting and publishing all need the AI model and a WooCommerce write key.
              </p>
              <button
                type="button"
                onClick={() => setStep('research')}
                disabled={!inspection.ok}
                title={inspection.ok ? 'Continue to research' : inspection.message}
                className="inline-flex items-center gap-2 rounded-xl bg-himalayan px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              >
                <Globe size={16} />
                Continue
              </button>
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Reading the source page"
            summary="Fetch the page, extract title, description, images and price, and note anything the source does not state."
            capabilities={['ai-text']}
            available={[
              'URL validation runs now, so a bad or self-referential source is rejected before any quota is spent.',
              'Import writes a WooCommerce draft product — nothing reaches the storefront until it is reviewed and published.',
            ]}
          />
        </>
      )}

      {step === 'research' && (
        <AdminCapabilityPanel
          title="Research"
          summary={`Read ${inspection.host ?? 'the source'} and assemble the facts a listing needs: what the product is, its size, its price and what shipping it implies.`}
          capabilities={['ai-text']}
          available={[
            'The source URL is already validated and carried into this step.',
            'Research output is shown as a draft for review, so a wrong detail is corrected rather than published.',
          ]}
        />
      )}

      {step === 'draft' && (
        <AdminCapabilityPanel
          title="Draft listing"
          summary="A title, description, category, price and SEO fields built from the research — all editable before it is saved."
          capabilities={['ai-text', 'ai-vision']}
          available={[
            'The draft lands as a WooCommerce draft product, so it uses the same editor and the same validation as a hand-written listing.',
            'Image alt text is written from the image itself; without a vision key the field stays empty rather than guessing.',
          ]}
        />
      )}

      {step === 'publish' && (
        <>
          <AdminPanel title="Publishing" description="What happens when a reviewed draft is saved">
            <ul className="space-y-2.5 text-sm text-admin-ink">
              <li>The draft becomes a WooCommerce product in draft status first — never live.</li>
              <li>
                Price, SKU and stock are only ever what the reviewer typed or the source stated. An
                unstated price stays unstated.
              </li>
              <li>The listing then appears in the Listing Task queue until every field a sale needs is present.</li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <AdminChip tone="muted">
                <CheckCircle2 size={11} /> Reviewed by a person
              </AdminChip>
              <AdminChip tone="muted">
                <Upload size={11} /> Writes to WooCommerce only
              </AdminChip>
              <AdminChip tone="muted">
                <Sparkles size={11} /> No auto-publish
              </AdminChip>
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Saving the draft"
            summary="Creating the WooCommerce draft product from the reviewed listing."
            capabilities={['woo-write', 'ai-text']}
          />
        </>
      )}
    </div>
  );
}
