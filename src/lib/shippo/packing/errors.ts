export class UnsupportedPackingProductsError extends Error {
  readonly products: { productId?: string; name: string; slug: string }[];

  constructor(products: { productId?: string; name: string; slug: string }[]) {
    const labels = products.map((p) => p.name || p.slug || 'Unknown product').join(', ');
    super(
      products.length === 1
        ? `Live carrier rates are not available for "${labels}". Standard flat-rate shipping applies.`
        : `Live carrier rates are not available for: ${labels}. Standard flat-rate shipping applies.`,
    );
    this.name = 'UnsupportedPackingProductsError';
    this.products = products;
  }
}
