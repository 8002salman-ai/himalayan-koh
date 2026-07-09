import { supabase } from '../client';
import type {
  Order,
  OrderItem,
  WholesalePurchaseRequestAuditEntry,
  WholesalePurchaseRequestMessage,
  WholesalePurchaseRequestNote,
  WholesalePurchaseRequestWithItems,
} from '../database.types';

export interface AdminWholesaleOrderRow extends Order {
  order_items: OrderItem[];
  wholesale_purchase_requests: { request_number: string; dealer_application: { business_name: string } | null } | null;
}

/** Fulfilment-stage filters for the Wholesale Orders admin view — these
 * are order-level states (post-conversion), distinct from the
 * pre-conversion pipeline statuses on wholesale_purchase_requests. */
export type WholesaleOrderFilter = 'all' | 'pending_payment' | 'paid' | 'shipped' | 'delivered';

export interface AdminPurchaseRequestFilters {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AdminPurchaseRequestListRow extends WholesalePurchaseRequestWithItems {
  dealer_application: { business_name: string } | null;
}

export const adminWholesaleApi = {
  async getRequests(
    filters: AdminPurchaseRequestFilters = {}
  ): Promise<{ requests: AdminPurchaseRequestListRow[]; count: number }> {
    let query = supabase
      .from('wholesale_purchase_requests')
      .select(
        '*, wholesale_purchase_request_items(*), dealer_application:dealer_applications(business_name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.ilike('request_number', `%${filters.search}%`);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { requests: data as unknown as AdminPurchaseRequestListRow[], count: count || 0 };
  },

  async getRequestDetail(requestId: string): Promise<{
    request: AdminPurchaseRequestListRow | null;
    notes: WholesalePurchaseRequestNote[];
    audit: WholesalePurchaseRequestAuditEntry[];
    messages: WholesalePurchaseRequestMessage[];
  }> {
    const [{ data: request, error: requestError }, { data: notes, error: notesError }, { data: audit, error: auditError }, { data: messages, error: messagesError }] =
      await Promise.all([
        supabase
          .from('wholesale_purchase_requests')
          .select(
            '*, wholesale_purchase_request_items(*), dealer_application:dealer_applications(business_name)'
          )
          .eq('id', requestId)
          .maybeSingle(),
        supabase
          .from('wholesale_purchase_request_notes')
          .select('*')
          .eq('purchase_request_id', requestId)
          .order('created_at', { ascending: false }),
        supabase
          .from('wholesale_purchase_request_audit')
          .select('*')
          .eq('purchase_request_id', requestId)
          .order('created_at', { ascending: false }),
        supabase
          .from('wholesale_purchase_request_messages')
          .select('*')
          .eq('purchase_request_id', requestId)
          .order('created_at', { ascending: true }),
      ]);

    if (requestError) throw requestError;
    if (notesError) throw notesError;
    if (auditError) throw auditError;
    if (messagesError) throw messagesError;

    return {
      request: request as unknown as AdminPurchaseRequestListRow | null,
      notes: (notes as WholesalePurchaseRequestNote[]) || [],
      audit: (audit as WholesalePurchaseRequestAuditEntry[]) || [],
      messages: (messages as WholesalePurchaseRequestMessage[]) || [],
    };
  },

  /** Real orders that originated from a converted wholesale purchase
   * request — kept as a dedicated view, separate from retail orders
   * (/admin/orders), per the business requirement that these are
   * different processes. */
  async getWholesaleOrders(filter: WholesaleOrderFilter = 'all'): Promise<AdminWholesaleOrderRow[]> {
    let query = supabase
      .from('orders')
      .select(
        '*, order_items(*), wholesale_purchase_requests!inner(request_number, dealer_application:dealer_applications(business_name))'
      )
      .not('source_purchase_request_id', 'is', null)
      .order('created_at', { ascending: false });

    if (filter === 'pending_payment') query = query.eq('payment_status', 'pending');
    if (filter === 'paid') query = query.eq('payment_status', 'paid').in('status', ['processing', 'packed', 'confirmed']);
    if (filter === 'shipped') query = query.eq('status', 'shipped');
    if (filter === 'delivered') query = query.eq('status', 'delivered');

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as AdminWholesaleOrderRow[];
  },

  async addNote(requestId: string, adminId: string, note: string): Promise<WholesalePurchaseRequestNote> {
    const { data, error } = await supabase
      .from('wholesale_purchase_request_notes')
      .insert({ purchase_request_id: requestId, admin_id: adminId, note } as never)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('wholesale_purchase_request_audit').insert({
      purchase_request_id: requestId,
      actor_id: adminId,
      action: 'internal_note_added',
    } as never);

    return data as WholesalePurchaseRequestNote;
  },

  async sendMessage(requestId: string, adminId: string, message: string): Promise<WholesalePurchaseRequestMessage> {
    const { data, error } = await supabase
      .from('wholesale_purchase_request_messages')
      .insert({
        purchase_request_id: requestId,
        sender_id: adminId,
        sender_role: 'admin',
        message,
      } as never)
      .select()
      .single();

    if (error) throw error;
    return data as WholesalePurchaseRequestMessage;
  },
};
