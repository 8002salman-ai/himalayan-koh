import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Receipt } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { wholesalePurchaseRequestApi, type DealerInvoiceRow } from '../../lib/supabase/api/wholesale';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import { SkeletonOrderList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

async function downloadPdf(url: string, accessToken: string, filename: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Unable to download invoice.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Every issued invoice (Proforma and Tax/Commercial) across every one of
 * this dealer's purchase requests. Each row is one immutable version —
 * older versions of the same invoice remain listed, never overwritten.
 */
export default function DealerInvoices() {
  const { user, session } = useAuthContext();
  const toast = useToast();
  const [invoices, setInvoices] = useState<DealerInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const rows = await wholesalePurchaseRequestApi.getMyInvoices(user.id);
        setInvoices(rows);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const handleDownload = (invoice: DealerInvoiceRow) => {
    if (!session?.access_token) return;
    const kind = invoice.invoice_type === 'commercial' ? 'tax-invoice' : 'invoice';
    downloadPdf(
      `/api/wholesale/purchase-requests/${invoice.purchase_request_id}/${kind}`,
      session.access_token,
      `${invoice.invoice_number}.pdf`
    ).catch((err) => toast.error(getErrorMessage(err, 'Failed to download invoice.')));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Invoices</h1>
        <p className="text-charcoal-light">Proforma invoices from your purchase requests, and tax/commercial invoices from converted orders</p>
      </div>

      {loading ? (
        <SkeletonOrderList count={3} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt size={40} />}
          title="No invoices yet"
          description="A proforma invoice is issued automatically when you submit a purchase request."
          action={{ label: 'Browse Catalog', href: '/dealer/products' }}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Purchase Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Issued</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {invoice.invoice_number} <span className="text-charcoal-light">· v{invoice.version}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          invoice.invoice_type === 'commercial' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {invoice.invoice_type === 'commercial' ? 'Tax / Commercial' : 'Proforma'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      <Link to={`/dealer/purchase-requests/${invoice.purchase_request_id}`} className="hover:underline">
                        {invoice.wholesale_purchase_requests?.request_number || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {new Date(invoice.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(invoice)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-himalayan hover:underline"
                      >
                        Download
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
