/**
 * src/lib/site/config.ts
 *
 * Single authoritative source for Himalayan Koh brand identity and email
 * configuration. All email addresses, domain strings, and feature flags live
 * HERE. Server-side only — never imported into browser bundles directly.
 *
 * API routes and server actions import from this module. The UI reads status
 * via API responses, never by importing this file directly.
 */

export const SITE_CONFIG = {
  siteName: 'Himalayan Koh',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://himalayankoh.com',
  emailDomain: 'himalayankoh.com',
  defaultFromEmail: 'sales@himalayankoh.com',
  salesEmail: 'sales@himalayankoh.com',
  supportEmail: 'support@himalayankoh.com',
  ordersEmail: 'orders@himalayankoh.com',

  /**
   * Where inbound @himalayankoh.com emails forward to.
   * Set CLOUDFLARE_EMAIL_FORWARD in server env to override.
   */
  forwardDestination: process.env.CLOUDFLARE_EMAIL_FORWARD ?? '8002salman@gmail.com',

  /** Cloudflare zone ID for DNS / email routing management. */
  cloudflareZone: process.env.CLOUDFLARE_ZONE_ID ?? null,
  /**
   * Cloudflare API token — required to call the CF Email Routing API.
   * Absent = cannot verify or manage routing rules from the app.
   */
  cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? null,

  /** Omnisend API key — absent = not configured. */
  omnisendKey: process.env.OMNISEND_API_KEY ?? null,

  /**
   * Resend API key — absent = simulation mode for outbound email.
   * Never expose this in a browser bundle.
   */
  resendKey: process.env.RESEND_API_KEY ?? null,

  /**
   * SAFETY GUARD — Real email dispatch is disabled unless both:
   *   1. resendKey is set, AND
   *   2. EMAIL_SEND_ENABLED=true is set in the server environment.
   *
   * This prevents staging/preview from accidentally sending real emails
   * even when a Resend key is present. The guard is server-side only;
   * the frontend UI cannot override it.
   */
  emailSendEnabled: process.env.EMAIL_SEND_ENABLED === 'true',
} as const;

/**
 * Status vocabulary for email configuration UI.
 * Each status maps to a distinct visual badge in AEmailMarketing.
 */
export type EmailVerificationStatus =
  | 'CONFIGURED'      // env var present, not tested
  | 'NOT_CONFIGURED'  // env var absent
  | 'VERIFIED'        // confirmed working (requires live API call)
  | 'UNVERIFIED'      // present but not yet confirmed
  | 'SIMULATION'      // configured but send intentionally disabled
  | 'NOT_VERIFIED';   // cannot verify from application code
