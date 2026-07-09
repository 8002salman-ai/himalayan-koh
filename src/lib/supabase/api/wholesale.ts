import { supabase } from '../client';
import type {
  WholesalePurchaseRequest,
  WholesalePurchaseRequestInvoice,
  WholesalePurchaseRequestItem,
  WholesalePurchaseRequestMessage,
  WholesalePurchaseRequestWithItems,
} from '../database.types';
import type { CreatePurchaseRequestData } from '@/lib/wholesale/serverCreatePurchaseRequest';

export interface DealerInvoiceRow extends WholesalePurchaseRequestInvoice {
  wholesale_purchase_requests: { request_number: string; status: string } | null;
}

async function createPurchaseRequestViaApi(
  data: CreatePurchaseRequestData
): Promise<WholesalePurchaseRequestWithItems> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await fetch('/api/wholesale/purchase-requests/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  const body = (await response.json().catch(() => ({}))) as WholesalePurchaseRequestWithItems & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Unable to submit purchase request (${response.status}).`);
  }
  return body;
}

export const wholesalePurchaseRequestApi = {
  createPurchaseRequest: createPurchaseRequestViaApi,

  async getMyRequests(dealerId: string): Promise<WholesalePurchaseRequestWithItems[]> {
    const { data, error } = await supabase
      .from('wholesale_purchase_requests')
      .select('*, wholesale_purchase_request_items(*)')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as WholesalePurchaseRequestWithItems[];
  },

  async getRequestById(requestId: string): Promise<WholesalePurchaseRequestWithItems | null> {
    const { data, error } = await supabase
      .from('wholesale_purchase_requests')
      .select('*, wholesale_purchase_request_items(*)')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    return data as WholesalePurchaseRequestWithItems | null;
  },

  async getMessages(requestId: string): Promise<WholesalePurchaseRequestMessage[]> {
    const { data, error } = await supabase
      .from('wholesale_purchase_request_messages')
      .select('*')
      .eq('purchase_request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as WholesalePurchaseRequestMessage[];
  },

  /** Every issued invoice (both proforma and commercial, every version)
   * across all of this dealer's purchase requests — RLS restricts this
   * to the caller's own rows regardless of the dealerId passed in. */
  async getMyInvoices(dealerId: string): Promise<DealerInvoiceRow[]> {
    const { data, error } = await supabase
      .from('wholesale_purchase_request_invoices')
      .select('*, wholesale_purchase_requests!inner(dealer_id, request_number, status)')
      .eq('wholesale_purchase_requests.dealer_id', dealerId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data as unknown as DealerInvoiceRow[];
  },

  /** Orders that originated from a converted purchase request (as opposed
   * to any other order type) for this dealer. */
  async getMyConvertedOrders(dealerId: string) {
    const { data: requests, error: requestsError } = await supabase
      .from('wholesale_purchase_requests')
      .select('converted_order_id')
      .eq('dealer_id', dealerId)
      .eq('status', 'converted')
      .not('converted_order_id', 'is', null);
    if (requestsError) throw requestsError;

    const orderIds = ((requests as { converted_order_id: string | null }[]) || [])
      .map((r) => r.converted_order_id)
      .filter((id): id is string => Boolean(id));
    if (orderIds.length === 0) return [];

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('id', orderIds)
      .order('created_at', { ascending: false });
    if (ordersError) throw ordersError;
    return orders;
  },

  async sendMessage(requestId: string, senderId: string, message: string): Promise<WholesalePurchaseRequestMessage> {
    const { data, error } = await supabase
      .from('wholesale_purchase_request_messages')
      .insert({
        purchase_request_id: requestId,
        sender_id: senderId,
        sender_role: 'dealer',
        message,
      } as never)
      .select()
      .single();

    if (error) throw error;
    return data as WholesalePurchaseRequestMessage;
  },
};

export type { WholesalePurchaseRequest, WholesalePurchaseRequestItem };
