import { supabase } from '../client';
import type {
  WholesalePurchaseRequest,
  WholesalePurchaseRequestItem,
  WholesalePurchaseRequestMessage,
  WholesalePurchaseRequestWithItems,
} from '../database.types';
import type { CreatePurchaseRequestData } from '@/lib/wholesale/serverCreatePurchaseRequest';

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
