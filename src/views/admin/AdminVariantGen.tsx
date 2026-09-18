'use client';

import { useMemo, useState } from 'react';
import { Boxes, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
  AdminTabs,
  AdminTable,
} from '../../components/admin/AdminUI';
import { useAdminCatalog } from '../../lib/admin/useAdminCatalog';
import { catalogSourceLabel } from '../../lib/admin/capabilities';

type Step = 'product' | 'attributes' | 'matrix';

const STEPS: { id: Step; label: string }[] = [
  { id: 'product', label: '1. Product' },
  { id: 'attributes', label: '2. Attributes' },
  { id: 'matrix', label: '3. Matrix' },
];

interface Axis {
  id: string;
  name: string;
  values: string;
}

/** A hard ceiling on generated rows: 4 axes of 10 values is already 10,000 products. */
const MAX_COMBINATIONS = 200;

function combinations(axes: Axis[]): string[][] {
  const usable = axes
    .map((axis) => ({
      name: axis.name.trim(),
      values: axis.values
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    }))
    .filter((axis) => axis.name && axis.values.length > 0);

  if (usable.length === 0) return [];

  return usable.reduce<string[][]>(
    (acc, axis) => acc.flatMap((row) => axis.values.map((value) => [...row, `${axis.name}: ${value}`])),
    [[]]
  );
}

/**
 * Variant Gen — Luxedge's four-step variant builder, over the Himalayan Koh
 * catalog.
 *
 * The matrix itself is deterministic arithmetic, so it is built here for real:
 * choosing axes and seeing exactly which combinations they produce is the whole
 * value of the screen, and it needs no model and no credential. Only the write
 * is missing, so only the write is disabled.
 */
export default function AdminVariantGen() {
  const [step, setStep] = useState<Step>('product');
  const [productId, setProductId] = useState('');
  const [axes, setAxes] = useState<Axis[]>([
    { id: 'a1', name: 'Weight', values: '1 lb, 2 lb, 5 lb' },
  ]);
  const { rows, loading, error, reload } = useAdminCatalog({ sort: 'name' });

  const selected = rows.find((row) => row.id === productId) ?? null;
  const combos = useMemo(() => combinations(axes), [axes]);
  const overflow = combos.length > MAX_COMBINATIONS;

  const updateAxis = (id: string, patch: Partial<Axis>) =>
    setAxes((current) => current.map((axis) => (axis.id === id ? { ...axis, ...patch } : axis)));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="AI Studio"
        title="Variant Gen"
        description="Turn one product into its size, weight or packaging combinations, without retyping the listing."
        actions={<AdminPendingChip label="WooCommerce write required" />}
      />

      {error && (
        <AdminNotice tone="danger" title="Could not read the catalog">
          {error}
        </AdminNotice>
      )}

      <AdminTabs tabs={STEPS} active={step} onChange={setStep} />

      {step === 'product' && (
        <>
          <AdminPanel
            title="Base product"
            description={`Read from ${catalogSourceLabel()} — variants are combinations of a product the store already sells`}
            action={
              <button
                type="button"
                onClick={reload}
                className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            }
          >
            <AdminField label="Product" hint="Variants are created as children of this product">
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="w-full rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2.5 text-sm text-admin-ink"
              >
                <option value="">
                  {loading ? 'Reading catalog…' : `${rows.length} products available`}
                </option>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </AdminField>

            {selected && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AdminChip tone="brand">{selected.categoryName ?? 'Uncategorised'}</AdminChip>
                {selected.missing.includes('price') ? (
                  <AdminChip tone="muted">Price unavailable</AdminChip>
                ) : (
                  <AdminChip tone="neutral">{selected.price}</AdminChip>
                )}
                {selected.sku ? (
                  <AdminChip tone="neutral">SKU {selected.sku}</AdminChip>
                ) : (
                  <AdminChip tone="warning">No SKU reported</AdminChip>
                )}
              </div>
            )}
          </AdminPanel>

          <AdminCapabilityPanel
            title="Creating the variants"
            summary="Writing the generated combinations to the product as WooCommerce variations."
            capabilities={['woo-write']}
            available={[
              'The base product and its category are readable now, so the generated variations can be previewed before anything is written.',
              'A variant is a WooCommerce variation, never a new row in another database.',
            ]}
          />
        </>
      )}

      {step === 'attributes' && (
        <AdminPanel
          title="Attributes that vary"
          description="One axis per attribute; values are comma-separated"
          action={
            <button
              type="button"
              onClick={() =>
                setAxes((current) => [
                  ...current,
                  { id: `a${current.length + 1}-${Date.now()}`, name: '', values: '' },
                ])
              }
              className="inline-flex items-center gap-2 rounded-xl border border-admin-line bg-admin-surface px-3.5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-admin-canvas"
            >
              <Plus size={15} />
              Add attribute
            </button>
          }
        >
          <div className="space-y-4">
            {axes.map((axis) => (
              <div key={axis.id} className="grid grid-cols-[240px_1fr_auto] items-end gap-4">
                <AdminField label="Attribute">
                  <AdminInput
                    value={axis.name}
                    onChange={(event) => updateAxis(axis.id, { name: event.target.value })}
                    placeholder="Weight"
                  />
                </AdminField>
                <AdminField label="Values" hint="Comma-separated — each becomes a variation">
                  <AdminInput
                    value={axis.values}
                    onChange={(event) => updateAxis(axis.id, { values: event.target.value })}
                    placeholder="1 lb, 2 lb, 5 lb"
                  />
                </AdminField>
                <button
                  type="button"
                  aria-label={`Remove ${axis.name || 'attribute'}`}
                  onClick={() => setAxes((current) => current.filter((item) => item.id !== axis.id))}
                  className="mb-1 rounded-xl border border-admin-line p-2.5 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {axes.length === 0 && (
              <p className="text-sm text-admin-muted">
                No attributes yet — add one to see the combinations it produces.
              </p>
            )}
          </div>
        </AdminPanel>
      )}

      {step === 'matrix' && (
        <>
          <AdminPanel
            title="Generated combinations"
            description={`${combos.length} combination${combos.length === 1 ? '' : 's'} from ${axes.filter((axis) => axis.name.trim() && axis.values.trim()).length} attribute(s)`}
          >
            {combos.length === 0 ? (
              <p className="text-sm text-admin-muted">
                Nothing to generate yet. Add an attribute with at least one value in step 2.
              </p>
            ) : overflow ? (
              <AdminNotice tone="warning" title="Too many combinations">
                This matrix would create {combos.length} products, above the {MAX_COMBINATIONS}-row
                ceiling for a single pass. Narrow an attribute before generating — a runaway variant
                write is not something a later screen can undo cleanly.
              </AdminNotice>
            ) : (
              <AdminTable
                columns={[
                  { key: 'index', label: '#', width: '64px' },
                  { key: 'combination', label: 'Combination' },
                  { key: 'state', label: 'Status', align: 'right' },
                ]}
                minWidth="640px"
              >
                {combos.map((combo, index) => (
                  <tr key={combo.join('|')}>
                    <td className={`${ADMIN_TD} text-admin-muted`}>{index + 1}</td>
                    <td className={`${ADMIN_TD} font-medium text-admin-ink`}>{combo.join(' · ')}</td>
                    <td className={`${ADMIN_TD} text-right`}>
                      <AdminChip tone="muted">Not created</AdminChip>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-admin-line pt-4">
              <p className="text-xs text-admin-muted">
                Combinations are computed here and not written anywhere.
              </p>
              <button
                type="button"
                disabled
                title="Creating variations needs a WooCommerce write key"
                className="inline-flex items-center gap-2 rounded-xl bg-himalayan px-4 py-2.5 text-sm font-semibold text-white opacity-50"
              >
                <Boxes size={16} />
                Create variations
              </button>
            </div>
          </AdminPanel>

          <AdminCapabilityPanel
            title="Writing the matrix"
            summary="Creating each combination as a WooCommerce variation with its own price, SKU and stock."
            capabilities={['woo-write']}
          />
        </>
      )}
    </div>
  );
}
