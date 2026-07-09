import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileCheck2, Send } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { wholesalePurchaseRequestApi } from '../../lib/supabase/api/wholesale';
import { getErrorMessage } from '../../lib/errors';
import {
  PURCHASE_REQUEST_PROGRESS_STEPS,
  formatPurchaseRequestStatus,
  getPurchaseRequestProgressIndex,
  purchaseRequestStatusBadgeClass,
} from '../../lib/wholesale/status';
import type { WholesalePurchaseRequestMessage, WholesalePurchaseRequestWithItems } from '../../lib/supabase/database.types';

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

export default function DealerPurchaseRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuthContext();
  const toast = useToast();

  const [request, setRequest] = useState<WholesalePurchaseRequestWithItems | null>(null);
  const [messages, setMessages] = useState<WholesalePurchaseRequestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [req, msgs] = await Promise.all([
        wholesalePurchaseRequestApi.getRequestById(id),
        wholesalePurchaseRequestApi.getMessages(id),
      ]);
      setRequest(req);
      setMessages(msgs);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load purchase request.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSendMessage = async () => {
    if (!user || !id || !messageText.trim()) return;
    try {
      await wholesalePurchaseRequestApi.sendMessage(id, user.id, messageText.trim());
      setMessageText('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send message.'));
    }
  };

  if (loading) return <div className="p-8 text-charcoal-light">Loading purchase request...</div>;
  if (!request) return <div className="p-8 text-charcoal-light">Purchase request not found.</div>;

  const items = request.wholesale_purchase_request_items || [];
  const progressIndex = getPurchaseRequestProgressIndex(request.status);
  const isRejectedOrCancelled = request.status === 'rejected' || request.status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dealer/purchase-requests" className="text-charcoal-light hover:text-charcoal">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{request.request_number}</h1>
          <p className="text-charcoal-light text-sm">Submitted {new Date(request.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold ${purchaseRequestStatusBadgeClass(request.status)}`}>
          {formatPurchaseRequestStatus(request.status)}
        </span>
      </div>

      {!isRejectedOrCancelled && (
        <div className="grid grid-cols-5 gap-2">
          {PURCHASE_REQUEST_PROGRESS_STEPS.map((step, index) => (
            <div
              key={step.key}
              className={`rounded-xl px-2 py-2 border text-center text-xs font-medium ${
                index <= progressIndex ? 'border-himalayan bg-himalayan/10 text-himalayan' : 'border-gray-100 text-charcoal-light'
              }`}
            >
              {step.shortLabel}
            </div>
          ))}
        </div>
      )}

      {request.status === 'rejected' && request.rejection_reason && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Rejected</p>
          <p className="mt-1">{request.rejection_reason}</p>
        </div>
      )}
      {request.status === 'changes_requested' && request.change_request_note && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Changes requested</p>
          <p className="mt-1">{request.change_request_note}</p>
        </div>
      )}
      {request.expected_dispatch_date && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Expected dispatch date: <strong>{new Date(request.expected_dispatch_date).toLocaleDateString()}</strong>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            session?.access_token &&
            downloadPdf(`/api/wholesale/purchase-requests/${request.id}/invoice`, session.access_token, `${request.request_number}-proforma.pdf`).catch((err) =>
              toast.error(getErrorMessage(err, 'Failed to download invoice.'))
            )
          }
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
        >
          <Download size={14} /> Proforma Invoice
        </button>
        {request.converted_order_id && (
          <>
            <button
              type="button"
              onClick={() =>
                session?.access_token &&
                downloadPdf(`/api/wholesale/purchase-requests/${request.id}/tax-invoice`, session.access_token, `${request.request_number}-tax-invoice.pdf`).catch((err) =>
                  toast.error(getErrorMessage(err, 'Failed to download invoice.'))
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
            >
              <FileCheck2 size={14} /> Tax / Commercial Invoice
            </button>
            <Link
              to={`/orders/${request.converted_order_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-himalayan text-white rounded-xl text-sm font-semibold hover:bg-himalayan-dark"
            >
              Track shipment →
            </Link>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="font-semibold text-charcoal mb-3">Line items</h2>
        <div className="space-y-2">
          {items.map((item) => {
            const qty = item.admin_adjusted_quantity ?? item.quantity;
            const price = item.admin_adjusted_unit_price ?? item.unit_price;
            return (
              <div key={item.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <span>{item.product_name} × {qty}</span>
                <span>${(qty * price).toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        <div className="text-right text-sm text-charcoal-light mt-3">
          <p>Subtotal: ${Number(request.subtotal).toFixed(2)} · Shipping: ${Number(request.shipping_cost).toFixed(2)} · Tax: ${Number(request.tax_amount).toFixed(2)}</p>
          <p className="font-semibold text-charcoal">Total: ${Number(request.total).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-charcoal">Messages</h2>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {messages.length === 0 && <p className="text-sm text-charcoal-light">No messages yet.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`text-sm rounded-lg p-2 ${m.sender_role === 'admin' ? 'bg-himalayan/10' : 'bg-gray-50'}`}>
              <p className="text-xs font-semibold uppercase text-charcoal-light">{m.sender_role === 'admin' ? 'Himalayan Koh' : 'You'}</p>
              <p>{m.message}</p>
              <p className="text-xs text-charcoal-light mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Message our wholesale team..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            className="flex items-center gap-2 px-4 py-2 bg-himalayan text-white rounded-xl text-sm font-semibold hover:bg-himalayan-dark"
          >
            <Send size={14} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
