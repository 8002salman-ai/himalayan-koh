import { ImageResponse } from 'next/og';
import { DEFAULT_DESCRIPTION, SITE_NAME } from '@/lib/seo/constants';

/**
 * Default social share card at a stable URL (/og.png).
 *
 * Social and search crawlers do not render SVG for og:image, so the site logo
 * cannot serve as the sharing image. This renders a real 1200x630 raster in
 * brand colors instead. Cached aggressively — the output never varies.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-static';

const BRAND = '#b86452';
const BRAND_DARK = '#8d4133';
const CHARCOAL = '#26211c';
const WARM_WHITE = '#faf7f1';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: WARM_WHITE,
          padding: '80px',
          borderBottom: `24px solid ${BRAND}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '32px',
              background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`,
            }}
          />
          <div
            style={{
              fontSize: '34px',
              letterSpacing: '6px',
              textTransform: 'uppercase',
              color: BRAND_DARK,
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            fontSize: '72px',
            fontWeight: 700,
            lineHeight: 1.12,
            color: CHARCOAL,
            maxWidth: '960px',
          }}
        >
          Premium Himalayan Pink Salt
        </div>

        <div
          style={{
            marginTop: '28px',
            fontSize: '34px',
            lineHeight: 1.4,
            color: '#6d6258',
            maxWidth: '900px',
          }}
        >
          {DEFAULT_DESCRIPTION}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
