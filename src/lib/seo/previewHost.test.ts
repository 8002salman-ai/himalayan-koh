import { describe, expect, it } from 'vitest';
import { PREVIEW_HOSTS, isPreviewHost } from './previewHost';

describe('isPreviewHost', () => {
  it('matches the preview subdomain', () => {
    expect(isPreviewHost('preview.himalayankoh.com')).toBe(true);
  });

  it('matches regardless of casing and an explicit port', () => {
    expect(isPreviewHost('Preview.HimalayanKoh.com')).toBe(true);
    expect(isPreviewHost('preview.himalayankoh.com:443')).toBe(true);
    expect(isPreviewHost('  preview.himalayankoh.com  ')).toBe(true);
  });

  it('matches the temporary verification alias while it exists', () => {
    // Added with the alias and removed with it — see PREVIEW_HOSTS.
    expect(isPreviewHost('himalayan-koh-admin-verify.vercel.app')).toBe(true);
  });

  it('never matches a host that carries the storefront in production', () => {
    for (const host of [
      'himalayankoh.com',
      'www.himalayankoh.com',
      'himalayan-koh.vercel.app',
      'staging.himalayankoh.com',
      // The apex must not be caught by the preview rule: a suffix match would
      // make the preview guard silently noindex the real site.
      'notpreview.himalayankoh.com',
      'preview.himalayankoh.com.evil.test',
      'localhost:3002',
      '',
      null,
      undefined,
    ]) {
      expect(isPreviewHost(host)).toBe(false);
    }
  });

  it('lists only non-production hosts', () => {
    // The Vercel project's own domain is deliberately absent: it is a host that
    // can serve the published storefront, so a suffix rule on `.vercel.app`
    // would risk noindexing production. Only the two hosts here are guarded.
    expect(PREVIEW_HOSTS).toEqual([
      'preview.himalayankoh.com',
      'himalayan-koh-admin-verify.vercel.app',
    ]);
    expect(isPreviewHost('himalayan-koh.vercel.app')).toBe(false);
  });
});
