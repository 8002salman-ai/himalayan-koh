/**
 * Server-rendered JSON-LD. Emits a <script type="application/ld+json"> into the
 * initial HTML so Google reads structured data without executing JS. Render one
 * per structured-data block (Product, Article, BreadcrumbList, Organization).
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here: it is our own server-built data,
      // and we escape '<' to prevent any stray </script> breakout.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
