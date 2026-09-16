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
    expect(PREVIEW_HOSTS).toEqual(['preview.himalayankoh.com']);
  });
});
