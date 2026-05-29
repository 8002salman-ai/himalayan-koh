/** Normalize Shippo/carrier name for Shippo Track API. */
export function normalizeShippoCarrier(carrier: string | null | undefined): string {
  const value = (carrier || '').trim().toLowerCase();
  if (value.includes('usps')) return 'usps';
  if (value.includes('ups')) return 'ups';
  if (value.includes('fedex')) return 'fedex';
  if (value.includes('dhl')) return 'dhl';
  return value.replace(/\s+/g, '_').slice(0, 20) || 'usps';
}

/** Build a carrier tracking URL when Shippo does not return tracking_url_provider. */
export function buildCarrierTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string
): string {
  const number = encodeURIComponent(trackingNumber.trim());
  const value = (carrier || '').toLowerCase();

  if (value.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`;
  }
  if (value.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${number}`;
  }
  if (value.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${number}`;
  }
  if (value.includes('dhl')) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${number}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier || 'package'} tracking ${trackingNumber}`)}`;
}

export function resolveTrackingUrl(order: {
  tracking_url?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
}): string | null {
  if (order.tracking_url?.trim()) return order.tracking_url.trim();
  if (!order.tracking_number?.trim()) return null;
  return buildCarrierTrackingUrl(order.shipping_carrier, order.tracking_number);
}

export function trackOrderPageUrl(orderNumber: string, email: string): string {
  const params = new URLSearchParams({
    order: orderNumber,
    email: email.trim(),
  });
  return `/track?${params.toString()}`;
}
