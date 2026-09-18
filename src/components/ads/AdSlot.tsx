import { headers } from 'next/headers';
import { adsenseEnabledForHost, ADSENSE_CLIENT } from '@/lib/ads/config';

/**
 * The single place an ad slot may be opened.
 *
 * Renders **nothing at all** — no wrapper, no reserved height, no placeholder — on
 * any host where ads are not enabled (see `lib/ads/config.ts` for why that is every
 * host except production today). Returning `null` instead of an empty container is
 * what keeps a disabled integration from costing layout: there is no box to
 * collapse and none to shift when it eventually fills.
 *
 * This is a server component that reads the request host, so a page that includes a
 * slot is server-rendered rather than prerendered. That is the right trade for an
 * ad: the alternative is deciding "may I show ads" at build time, when the only
 * honest answer is "not on this host", and the decision has to hold for the staging
 * and preview hosts that serve this same build.
 *
 * Only one component exists for this on purpose — the publisher ID is an
 * environment variable read here, not a literal repeated across pages.
 */
export default async function AdSlot({
  slot,
  format = 'auto',
  className,
  label,
}: {
  /** The AdSense ad-unit id for this placement. */
  slot: string;
  format?: string;
  className?: string;
  /** Accessible label for the region, since an ad is not the page's content. */
  label?: string;
}) {
  const host = (await headers()).get('host');
  if (!adsenseEnabledForHost(host)) return null;

  return (
    <div className={className} role="complementary" aria-label={label ?? 'Advertisement'}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
