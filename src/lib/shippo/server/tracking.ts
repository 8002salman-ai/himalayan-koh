import { normalizeShippoCarrier } from '@/lib/orders/tracking';
import { shippoRequest } from './client';

export interface ShippoTrackingEvent {
  status: string;
  statusDetails: string;
  statusDate: string | null;
  location: string | null;
}

export interface ShippoTrackingResult {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  status: string;
  statusDetails: string;
  events: ShippoTrackingEvent[];
}

interface ShippoTrackResponse {
  tracking_number?: string;
  carrier?: string;
  tracking_url_provider?: string;
  tracking_status?: {
    status?: string;
    status_details?: string;
    status_date?: string;
    location?: { city?: string; state?: string; country?: string };
  };
  tracking_history?: {
    status?: string;
    status_details?: string;
    status_date?: string;
    location?: { city?: string; state?: string; country?: string };
  }[];
}

function formatLocation(location?: { city?: string; state?: string; country?: string }): string | null {
  if (!location) return null;
  return [location.city, location.state, location.country].filter(Boolean).join(', ') || null;
}

export async function fetchShippoTracking(
  carrier: string,
  trackingNumber: string
): Promise<ShippoTrackingResult> {
  const normalizedCarrier = normalizeShippoCarrier(carrier);
  const payload = await shippoRequest<ShippoTrackResponse>('/tracks/', {
    method: 'POST',
    body: {
      carrier: normalizedCarrier,
      tracking_number: trackingNumber,
    },
  });

  const events = (payload.tracking_history || []).map((entry) => ({
    status: entry.status || 'UNKNOWN',
    statusDetails: entry.status_details || '',
    statusDate: entry.status_date || null,
    location: formatLocation(entry.location),
  }));

  return {
    carrier: payload.carrier || normalizedCarrier,
    trackingNumber: payload.tracking_number || trackingNumber,
    trackingUrl: payload.tracking_url_provider || null,
    status: payload.tracking_status?.status || events[0]?.status || 'UNKNOWN',
    statusDetails: payload.tracking_status?.status_details || events[0]?.statusDetails || 'Tracking registered',
    events,
  };
}
