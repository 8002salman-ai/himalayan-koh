'use client';

import Link from 'next/link';
import { PackagePlus, Ruler, Scale } from 'lucide-react';
import AdminProducts from './AdminProducts';

export default function ShippingReadyProductsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-700">
              <PackagePlus size={18} /> New catalog workflow
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Create products with required shipping measurements</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Use the shipping-ready form for every new product. It requires unit weight, product dimensions, approved box dimensions, packaging weight and units per box so Shippo can calculate multiple parcels and labels correctly.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5"><Scale size={14} /> Actual and billable weight</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5"><Ruler size={14} /> Product and box measurements</span>
            </div>
          </div>
          <Link href="/admin/new-shipping-product" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-amber-700">
            <PackagePlus size={19} /> Add shipping-ready product
          </Link>
        </div>
      </section>

      <AdminProducts />
    </div>
  );
}
