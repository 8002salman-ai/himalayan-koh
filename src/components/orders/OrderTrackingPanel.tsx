import { ExternalLink, MapPin, Package, RefreshCw, Truck } from 'lucide-react';
import { resolveTrackingUrl } from '@/lib/orders/tracking';

interface TrackingEvent {
  status: string;
  statusDetails: string;
  statusDate: string | null;
  location: string | null;
}

interface OrderTrackingPanelProps {
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  carrier?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  liveStatus?: string | null;
  liveStatusDetails?: string | null;
  events?: TrackingEvent[];
  compact?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function OrderTrackingPanel({
  orderNumber,
  email,
  status,
  paymentStatus,
  carrier,
  service,
  trackingNumber,
  trackingUrl: trackingUrlProp,
  liveStatus,
  liveStatusDetails,
  events = [],
  compact = false,
  onRefresh,
  refreshing = false,
}: OrderTrackingPanelProps) {
  const trackingUrl =
    trackingUrlProp ||
    resolveTrackingUrl({
      tracking_url: trackingUrlProp,
      tracking_number: trackingNumber,
      shipping_carrier: carrier,
    });

  const trackPageHref = `/track?${new URLSearchParams({ order: orderNumber, email }).toString()}`;

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white ${compact ? 'p-4' : 'p-6 shadow-md'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className={`font-serif font-bold text-charcoal ${compact ? 'text-base' : 'text-lg'}`}>
            Shipment tracking
          </h3>
          <p className="text-sm text-charcoal-light mt-1">
            {paymentStatus === 'paid'
              ? status === 'pending'
                ? 'Payment confirmed · Preparing shipment'
                : `Payment confirmed · Order ${status}`
              : `Payment pending · Order ${status}`}
          </p>
        </div>
        {onRefresh && trackingNumber && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-himalayan hover:underline disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {!trackingNumber ? (
        <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-charcoal-light">
          <Package size={28} className="text-gray-300 mb-2" />
          <p className="font-medium text-charcoal">Preparing your shipment</p>
          <p className="mt-1">
            Tracking will appear here and by email when your label is created. You can bookmark{' '}
            <a href={trackPageHref} className="text-himalayan font-semibold hover:underline">
              your tracking page
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-himalayan/5 border border-himalayan/20 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-charcoal-light font-semibold">Tracking number</p>
            <p className="font-mono text-lg font-bold text-charcoal mt-1">{trackingNumber}</p>
            {(carrier || service) && (
              <p className="text-sm text-charcoal-light mt-1">
                {[carrier, service].filter(Boolean).join(' · ')}
              </p>
            )}
            {liveStatus && (
              <p className="text-sm font-semibold text-himalayan mt-2 capitalize">
                {liveStatus.replace(/_/g, ' ')}
                {liveStatusDetails ? ` — ${liveStatusDetails}` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 bg-charcoal hover:bg-charcoal-light text-white font-semibold rounded-xl transition-colors"
              >
                <Truck size={18} />
                Track package
                <ExternalLink size={14} />
              </a>
            )}
            <a
              href={trackPageHref}
              className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3 border border-himalayan text-himalayan font-semibold rounded-xl hover:bg-himalayan/5 transition-colors"
            >
              Live status on site
            </a>
          </div>

          {events.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-charcoal mb-3">Tracking history</p>
              <ol className="space-y-3">
                {events.map((event, index) => (
                  <li key={`${event.status}-${event.statusDate}-${index}`} className="flex gap-3 text-sm">
                    <MapPin size={16} className="text-himalayan flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-charcoal capitalize">
                        {event.status.replace(/_/g, ' ')}
                      </p>
                      {event.statusDetails && (
                        <p className="text-charcoal-light">{event.statusDetails}</p>
                      )}
                      <p className="text-xs text-charcoal-light mt-0.5">
                        {[event.location, event.statusDate ? new Date(event.statusDate).toLocaleString() : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
