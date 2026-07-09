import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileCheck2, Send } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useAuthContext } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { adminWholesaleApi, type AdminPurchaseRequestListRow } from '../../../lib/supabase/api/adminWholesale';
import { reviewWholesalePurchaseRequest } from '../../../lib/admin/updateWholesalePurchaseRequestClient';
import { convertWholesalePurchaseRequest } from '../../../lib/admin/convertWholesalePurchaseRequestClient';
import { getErrorMessage } from '../../../lib/errors';
import {
  allowedNextStatuses,
  formatPurchaseRequestStatus,
  purchaseRequestStatusBadgeClass,
} from '../../../lib/wholesale/status';
import type {
  WholesalePurchaseRequestAuditEntry,
  WholesalePurchaseRequestItem,
  WholesalePurchaseRequestMessage,
  WholesalePurchaseRequestNote,
} from '../../../lib/supabase/database.types';

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

export default function AdminWholesalePurchaseRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuthContext();
  const toast = useToast();

  const [request, setRequest] = useState<AdminPurchaseRequestListRow | null>(null);
  const [notes, setNotes] = useState<WholesalePurchaseRequestNote[]>([]);
  const [audit, setAudit] = useState<WholesalePurchaseRequestAuditEntry[]>([]);
  const [messages, setMessages] = useState<WholesalePurchaseRequestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [itemEdits, setItemEdits] = useState<Record<string, { stockVerified?: boolean; adjustedQuantity?: number; adjustedUnitPrice?: number }>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail = await adminWholesaleApi.getRequestDetail(id);
      setRequest(detail.request);
      setNotes(detail.notes);
      setAudit(detail.audit);
      setMessages(detail.messages);
      setDispatchDate(detail.request?.expected_dispatch_date || '');
      setPaymentMethod(detail.request?.payment_method || '');
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

  if (loading) {
    return <div className="p-8 text-charcoal-light">Loading purchase request...</div>;
  }
  if (!request) {
    return <div className="p-8 text-charcoal-light">Purchase request not found.</div>;
  }

  const items: WholesalePurchaseRequestItem[] = request.wholesale_purchase_request_items || [];
  const nextStatuses = allowedNextStatuses(request.status);

  const setItemEdit = (itemId: string, patch: Partial<{ stockVerified: boolean; adjustedQuantity: number; adjustedUnitPrice: number }>) => {
    setItemEdits((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  };

  const handleSaveItems = async () => {
    if (!session?.access_token || Object.keys(itemEdits).length === 0) return;
    setSaving(true);
    try {
      await reviewWholesalePurchaseRequest(session.access_token, {
        requestId: request.id,
        items: Object.entries(itemEdits).map(([itemId, edit]) => ({ itemId, ...edit })),
      });
      toast.success('Line items updated.');
      setItemEdits({});
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update line items.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      await reviewWholesalePurchaseRequest(session.access_token, {
        requestId: request.id,
        status: status as never,
        reason: status === 'rejected' ? reasonText : undefined,
        changeNote: status === 'changes_requested' ? reasonText : undefined,
        paymentMethod: status === 'payment_pending' || status === 'paid' ? paymentMethod || undefined : undefined,
      });
      toast.success(`Purchase request marked ${formatPurchaseRequestStatus(status as never).toLowerCase()}.`);
      setReasonText('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update status.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDispatchDate = async () => {
    if (!session?.access_token || !dispatchDate) return;
    setSaving(true);
    try {
      await reviewWholesalePurchaseRequest(session.access_token, { requestId: request.id, expectedDispatchDate: dispatchDate });
      toast.success('Expected dispatch date saved.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save dispatch date.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!user || !noteText.trim()) return;
    try {
      await adminWholesaleApi.addNote(request.id, user.id, noteText.trim());
      setNoteText('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add note.'));
    }
  };

  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return;
    try {
      await adminWholesaleApi.sendMessage(request.id, user.id, messageText.trim());
      setMessageText('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send message.'));
    }
  };

  const handleConvert = async () => {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      const order = await convertWholesalePurchaseRequest(session.access_token, request.id);
      toast.success(`Converted to order ${order.order_number}.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to convert purchase request.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/dealers/purchase-requests" className="text-charcoal-light hover:text-charcoal">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{request.request_number}</h1>
          <p className="text-charcoal-light text-sm">{request.dealer_application?.business_name || 'Dealer'}</p>
        </div>
        <span className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold ${purchaseRequestStatusBadgeClass(request.status)}`}>
          {formatPurchaseRequestStatus(request.status)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download size={14} />}
          onClick={() =>
            session?.access_token &&
            downloadPdf(`/api/wholesale/purchase-requests/${request.id}/invoice`, session.access_token, `${request.request_number}-proforma.pdf`).catch((err) =>
              toast.error(getErrorMessage(err, 'Failed to download invoice.'))
            )
          }
        >
          Proforma Invoice
        </Button>
        {request.converted_order_id && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileCheck2 size={14} />}
            onClick={() =>
              session?.access_token &&
              downloadPdf(`/api/wholesale/purchase-requests/${request.id}/tax-invoice`, session.access_token, `${request.request_number}-tax-invoice.pdf`).catch((err) =>
                toast.error(getErrorMessage(err, 'Failed to download invoice.'))
              )
            }
          >
            Tax / Commercial Invoice
          </Button>
        )}
        {request.converted_order_id && (
          <Link to={`/admin/orders?orderId=${request.converted_order_id}`} className="text-sm font-semibold text-himalayan self-center hover:underline">
            View converted order →
          </Link>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="font-semibold text-charcoal mb-3">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-charcoal-light border-b border-gray-100">
              <tr>
                <th className="text-left py-2 pr-2">Product</th>
                <th className="text-right py-2 pr-2">Requested Qty</th>
                <th className="text-right py-2 pr-2">Unit Price</th>
                <th className="text-center py-2 pr-2">Stock Verified</th>
                <th className="text-right py-2 pr-2">Adjusted Qty</th>
                <th className="text-right py-2">Adjusted Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const edit = itemEdits[item.id] || {};
                return (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2 pr-2">{item.product_name}</td>
                    <td className="py-2 pr-2 text-right">{item.quantity}</td>
                    <td className="py-2 pr-2 text-right">${Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={edit.stockVerified ?? item.stock_verified}
                        onChange={(e) => setItemEdit(item.id, { stockVerified: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        type="number"
                        min={1}
                        defaultValue={item.admin_adjusted_quantity ?? item.quantity}
                        onChange={(e) => setItemEdit(item.id, { adjustedQuantity: Number(e.target.value) })}
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={item.admin_adjusted_unit_price ?? item.unit_price}
                        onChange={(e) => setItemEdit(item.id, { adjustedUnitPrice: Number(e.target.value) })}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <Button size="sm" isLoading={saving} disabled={Object.keys(itemEdits).length === 0} onClick={handleSaveItems}>
            Save line item changes
          </Button>
          <div className="text-right text-sm text-charcoal-light">
            <p>Subtotal: ${Number(request.subtotal).toFixed(2)} · Shipping: ${Number(request.shipping_cost).toFixed(2)} · Tax: ${Number(request.tax_amount).toFixed(2)}</p>
            <p className="font-semibold text-charcoal">Total: ${Number(request.total).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Status actions */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-charcoal">Review actions</h2>
        {(request.status === 'rejected' ? false : nextStatuses.includes('rejected') || nextStatuses.includes('changes_requested')) && (
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Reason / notes for reject or request-changes actions..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
        )}
        {(nextStatuses.includes('payment_pending') || nextStatuses.includes('paid')) && (
          <input
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Payment method (e.g. Bank transfer, Cash)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === 'rejected' || s === 'cancelled' ? 'destructive' : 'primary'}
              isLoading={saving}
              onClick={() => handleStatusChange(s)}
            >
              {formatPurchaseRequestStatus(s)}
            </Button>
          ))}
          {request.status === 'paid' && (
            <Button size="sm" variant="primary" isLoading={saving} onClick={handleConvert}>
              Convert to Order
            </Button>
          )}
        </div>
      </div>

      {/* Expected dispatch date */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold text-charcoal">Expected dispatch date</h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={dispatchDate}
            onChange={(e) => setDispatchDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
          <Button size="sm" isLoading={saving} onClick={handleSaveDispatchDate}>Save</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Internal notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-charcoal">Internal notes</h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {notes.length === 0 && <p className="text-sm text-charcoal-light">No internal notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="text-sm bg-gray-50 rounded-lg p-2">
                <p>{n.note}</p>
                <p className="text-xs text-charcoal-light mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add internal note (not visible to dealer)..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={handleAddNote}>Add</Button>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-charcoal">Messages with dealer</h2>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {messages.length === 0 && <p className="text-sm text-charcoal-light">No messages yet.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`text-sm rounded-lg p-2 ${m.sender_role === 'admin' ? 'bg-himalayan/10' : 'bg-gray-50'}`}>
                <p className="text-xs font-semibold uppercase text-charcoal-light">{m.sender_role}</p>
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
              placeholder="Message the dealer..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <Button size="sm" leftIcon={<Send size={14} />} onClick={handleSendMessage}>Send</Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="font-semibold text-charcoal mb-3">Timeline</h2>
        <div className="space-y-2">
          {audit.length === 0 && <p className="text-sm text-charcoal-light">No activity yet.</p>}
          {audit.map((entry) => (
            <div key={entry.id} className="text-sm flex items-center justify-between border-b border-gray-50 pb-2">
              <span className="capitalize">{entry.action.replace(/_/g, ' ')}</span>
              <span className="text-xs text-charcoal-light">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
