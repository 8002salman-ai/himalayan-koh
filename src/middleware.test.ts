import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from './middleware';

/**
 * The edge rules, exercised on real URLs.
 *
 * These cases are the measured leaks, not invented ones: each redirect below
 * stands for a URL that, on the running build, answered 200 and repeated an
 * animal-product term back into its own raw HTML before this rule existed.
 */

function run(url: string) {
  const response = middleware(new NextRequest(new URL(url, 'https://himalayankoh.com')));
  return {
    passesThrough: response.headers.get('x-middleware-next') === '1',
    status: response.status,
    location: response.headers.get('location'),
  };
}

describe('middleware — content URLs that name something off-niche', () => {
  it('retires a withheld product slug instead of echoing it', () => {
    expect(run('/products/salt-licks-for-horses')).toEqual({
      passesThrough: false,
      status: 308,
      location: 'https://himalayankoh.com/products',
    });
    expect(run('/products/salt-licks').status).toBe(308);
  });

  it('decodes the segment before judging it', () => {
    expect(run('/products/salt%2Dlicks').status).toBe(308);
  });

  it('retires a livestock article URL rather than rendering its slug', () => {
    expect(run('/blog/why-do-dairy-cows-need-trace-minerals')).toEqual({
      passesThrough: false,
      status: 308,
      location: 'https://himalayankoh.com/blog',
    });
  });

  it('leaves real product and article URLs alone', () => {
    expect(run('/products/himalayan-koh-edible-salt-grain').passesThrough).toBe(true);
    expect(run('/blog/himalayan-pink-salt-vs-white-salt-farmers').passesThrough).toBe(true);
  });

  it('does not touch routes that carry session or payment parameters', () => {
    for (const url of ['/checkout?token=abc', '/track?order=42', '/admin?search=horses', '/account']) {
      expect(run(url).passesThrough).toBe(true);
    }
  });
});

describe('middleware — browse query strings', () => {
  it('drops a search term that names an animal product', () => {
    expect(run('/products?search=horses').location).toBe('https://himalayankoh.com/products');
    expect(run('/products?search=livestock').status).toBe(308);
  });

  it('keeps the rest of the request while dropping the offending filter', () => {
    expect(run('/products?search=cat&category=bulk').location).toBe(
      'https://himalayankoh.com/products?category=bulk'
    );
  });

  it('drops a retired shelf value', () => {
    expect(run('/products?category=salt-lick-horses').location).toBe(
      'https://himalayankoh.com/products'
    );
    expect(run('/products?category=animal-feed').status).toBe(308);
  });

  it('normalises a live shelf addressed with padding or different casing', () => {
    expect(run('/products?category=Bulk').location).toBe('https://himalayankoh.com/products?category=bulk');
  });

  it('passes through a query it has no business rewriting', () => {
    for (const url of ['/products', '/products?category=bulk', '/products?page=2&sort=price']) {
      expect(run(url).passesThrough).toBe(true);
    }
  });

  it('applies the same rule to the blog index', () => {
    expect(run('/blog?search=cows').location).toBe('https://himalayankoh.com/blog');
    expect(run('/blog?page=2').passesThrough).toBe(true);
  });
});
