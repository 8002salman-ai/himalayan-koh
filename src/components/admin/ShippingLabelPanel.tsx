import { Download, ExternalLink, Loader2, Printer, Truck } from 'lucide-react';
import type { AdminOrder } from '../../lib/supabase/api/admin';
import { formatShippoLabelError } from '../../lib/shippo/carrierErrors';

interface ShippingLabelPanelProps {
  order: AdminOrder;
  shippoEnabled: boolean;
  labelCreating?: boolean;
  labelError?: string | null;
  labelNotice?: string | null;
  onCreateLabel?: () => void;
  /** full = order detail sidebar; page = labels list row */
  variant?: 'full' | 'page';
}

export default function ShippingLabelPanel({
  order,
  shippoEnabled,
  labelCreating = false,
  labelError = null,
  labelNotice = null,
  onCreateLabel,
  variant = 'full',
}: ShippingLabelPanelProps) {
  const hasLabel = Boolean(order.label_url);
  const needsLabel =
    shippoEnabled &&
    order.payment_status === 'paid' &&
    !order.label_url &&
    order.status !== 'cancelled';
  const labelErrorInfo = labelError ? formatShippoLabelError(labelError) : null;

  if (!shippoEnabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Shippo is disabled. Enable <code className="text-xs">NEXT_PUBLIC_SHIPPO_ENABLED</code> to create labels.
      </div>
    );
  }

  if (!hasLabel && !needsLabel && !labelError && !labelNotice) {
    if (variant === 'page') return null;
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-charcoal-light">
        No shipping label for this order yet. Labels appear here after payment is confirmed and you create one.
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/60 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck size={18} className="text-indigo-700" />
        <p className="font-bold text-charcoal">Shipping Labels</p>
      </div>

      {hasLabel && (
        <div className={`grid gap-2 ${variant === 'page' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          <a
            href={order.label_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            <Download size={16} />
            Download label (PDF)
          </a>
          <a
            href={order.label_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            <Printer size={16} />
            Print label
          </a>
          {order.tracking_url && (
            <a
              href={order.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-charcoal hover:bg-gray-50 transition-colors ${variant === 'full' ? '' : 'sm:col-span-2'}`}
            >
              <ExternalLink size={16} />
              Track package
            </a>
          )}
        </div>
      )}

      {hasLabel && order.tracking_number && (
        <p className="mt-3 text-xs text-charcoal-light">
          Tracking: <span className="font-semibold text-charcoal">{order.tracking_number}</span>
          {order.shipping_carrier ? ` · ${order.shipping_carrier}` : ''}
        </p>
      )}

      {needsLabel && (
        <>
          {variant === 'full' && (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-charcoal-light">
              <li>Pack the order and confirm the shipping address.</li>
              <li>Create the Shippo label — tracking is emailed to the customer.</li>
              <li>Download or print the PDF and attach it to the package.</li>
            </ol>
          )}
          {needsLabel && order.shipping_carrier && !/usps/i.test(order.shipping_carrier) && (
            <p className="mb-3 text-xs text-amber-800">
              Checkout selected {order.shipping_carrier}. If that carrier is not active in Shippo, we automatically try USPS.
            </p>
          )}
          {onCreateLabel && (
            <button
              type="button"
              onClick={onCreateLabel}
              disabled={labelCreating}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-himalayan bg-white px-4 py-3 text-sm font-bold text-himalayan hover:bg-himalayan/5 transition-colors disabled:opacity-70"
            >
              {labelCreating ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
              {labelCreating ? 'Creating label...' : 'Create Shippo Label'}
            </button>
          )}
        </>
      )}

      {labelNotice && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {labelNotice}
        </p>
      )}

      {labelErrorInfo && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
          <p className="font-semibold">{labelErrorInfo.title}</p>
          <p className="mt-1">{labelErrorInfo.detail}</p>
          {labelErrorInfo.actionUrl && (
            <a
              href={labelErrorInfo.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-semibold text-red-900 underline"
            >
              {labelErrorInfo.actionLabel}
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
