import { supabase } from '../client';
import type {
  DealerApplication,
  DealerApplicationWithDocuments,
  DealerAuditLogEntry,
  DealerDocument,
  DealerEmailLogEntry,
  DealerNote,
  Profile,
} from '../database.types';

export interface AdminDealerApplicationFilters {
  status?: DealerApplication['status'] | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminDealerApplicationDetail extends DealerApplicationWithDocuments {
  dealer_notes: DealerNote[];
  dealer_audit_log: DealerAuditLogEntry[];
  dealer_emails: DealerEmailLogEntry[];
  sales_rep: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
}

export const adminDealerApi = {
  async getApplications(filters: AdminDealerApplicationFilters = {}): Promise<{
    applications: DealerApplication[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('dealer_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      query = query.or(
        `business_name.ilike.%${filters.search}%,owner_name.ilike.%${filters.search}%,business_email.ilike.%${filters.search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      applications: (data || []) as DealerApplication[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getApplication(id: string): Promise<AdminDealerApplicationDetail | null> {
    const { data, error } = await supabase
      .from('dealer_applications')
      .select(
        '*, dealer_documents(*), dealer_notes(*), dealer_audit_log(*), dealer_emails(*), sales_rep:sales_rep_id(id, full_name, email)'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const detail = data as unknown as AdminDealerApplicationDetail;
    detail.dealer_notes = [...(detail.dealer_notes || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    detail.dealer_audit_log = [...(detail.dealer_audit_log || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    detail.dealer_emails = [...(detail.dealer_emails || [])].sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
    return detail;
  },

  async addNote(applicationId: string, adminId: string, note: string): Promise<void> {
    const { error } = await supabase.from('dealer_notes').insert({
      application_id: applicationId,
      admin_id: adminId,
      note,
    } as never);
    if (error) throw error;

    await supabase.from('dealer_audit_log').insert({
      application_id: applicationId,
      actor_id: adminId,
      action: 'note_added',
    } as never);
  },

  async verifyDocument(documentId: string, adminId: string, verified: boolean): Promise<DealerDocument> {
    const { data, error } = await supabase
      .from('dealer_documents')
      .update({
        is_verified: verified,
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      } as never)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data as DealerDocument;
  },

  async updateDealerSettings(
    applicationId: string,
    adminId: string,
    updates: {
      dealerLevel?: DealerApplication['dealer_level'];
      creditTerms?: number;
      salesRepId?: string | null;
    }
  ): Promise<DealerApplication> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.dealerLevel !== undefined) payload.dealer_level = updates.dealerLevel;
    if (updates.creditTerms !== undefined) payload.credit_terms = updates.creditTerms;
    if (updates.salesRepId !== undefined) payload.sales_rep_id = updates.salesRepId;

    const { data, error } = await supabase
      .from('dealer_applications')
      .update(payload as never)
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('dealer_audit_log').insert({
      application_id: applicationId,
      actor_id: adminId,
      action: 'dealer_settings_updated',
      details: updates,
    } as never);

    return data as DealerApplication;
  },

  async listSalesReps(): Promise<Pick<Profile, 'id' | 'full_name' | 'email'>[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return (data || []) as Pick<Profile, 'id' | 'full_name' | 'email'>[];
  },

  async updateProductPricing(
    productId: string,
    adminId: string,
    updates: {
      dealerPrice?: number | null;
      distributorPrice?: number | null;
      moq?: number;
      dealerOnly?: boolean;
      retailOnly?: boolean;
      packSize?: string | null;
      leadTimeDays?: number | null;
    }
  ): Promise<void> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.dealerPrice !== undefined) payload.dealer_price = updates.dealerPrice;
    if (updates.distributorPrice !== undefined) payload.distributor_price = updates.distributorPrice;
    if (updates.moq !== undefined) payload.moq = updates.moq;
    if (updates.dealerOnly !== undefined) payload.dealer_only = updates.dealerOnly;
    if (updates.retailOnly !== undefined) payload.retail_only = updates.retailOnly;
    if (updates.packSize !== undefined) payload.pack_size = updates.packSize;
    if (updates.leadTimeDays !== undefined) payload.lead_time_days = updates.leadTimeDays;

    const { error } = await supabase.from('products').update(payload as never).eq('id', productId);
    if (error) throw error;
    void adminId; // reserved for a future audit trail on pricing changes
  },

  async getDashboardStats(): Promise<{
    totalApplications: number;
    byStatus: Record<DealerApplication['status'], number>;
    byLevel: Record<DealerApplication['dealer_level'], number>;
    totalDealerRevenue: number;
    totalDealerOrders: number;
  }> {
    const { data: applications, error } = await supabase
      .from('dealer_applications')
      .select('user_id, status, dealer_level');
    if (error) throw error;

    const apps = (applications || []) as Pick<DealerApplication, 'user_id' | 'status' | 'dealer_level'>[];
    const byStatus: Record<string, number> = { pending: 0, under_review: 0, need_more_info: 0, approved: 0, rejected: 0, suspended: 0 };
    const byLevel: Record<string, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const app of apps) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      byLevel[app.dealer_level] = (byLevel[app.dealer_level] || 0) + 1;
    }

    const approvedUserIds = apps.filter((a) => a.status === 'approved').map((a) => a.user_id);
    let totalDealerRevenue = 0;
    let totalDealerOrders = 0;
    if (approvedUserIds.length > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total')
        .in('user_id', approvedUserIds);
      if (ordersError) throw ordersError;
      totalDealerOrders = orders?.length || 0;
      totalDealerRevenue = (orders || []).reduce((sum, o) => sum + Number((o as { total: number }).total), 0);
    }

    return {
      totalApplications: apps.length,
      byStatus: byStatus as Record<DealerApplication['status'], number>,
      byLevel: byLevel as Record<DealerApplication['dealer_level'], number>,
      totalDealerRevenue,
      totalDealerOrders,
    };
  },

  async getDealers(filters: { search?: string; page?: number; limit?: number } = {}): Promise<{
    dealers: (DealerApplication & { sales_rep: Pick<Profile, 'id' | 'full_name' | 'email'> | null; orderCount: number; totalSpend: number })[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('dealer_applications')
      .select('*, sales_rep:sales_rep_id(id, full_name, email)', { count: 'exact' })
      .eq('status', 'approved')
      .order('business_name', { ascending: true });

    if (filters.search) {
      query = query.or(`business_name.ilike.%${filters.search}%,owner_name.ilike.%${filters.search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const dealers = (data || []) as unknown as (DealerApplication & {
      sales_rep: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
    })[];

    const withStats = await Promise.all(
      dealers.map(async (dealer) => {
        const { data: orders } = await supabase.from('orders').select('total').eq('user_id', dealer.user_id);
        const orderList = (orders || []) as { total: number }[];
        return {
          ...dealer,
          orderCount: orderList.length,
          totalSpend: orderList.reduce((sum, o) => sum + Number(o.total), 0),
        };
      })
    );

    return { dealers: withStats, count: count || 0, totalPages: Math.ceil((count || 0) / limit) };
  },

  async getAllDocuments(filters: { verified?: boolean; page?: number; limit?: number } = {}): Promise<{
    documents: (DealerDocument & { application: Pick<DealerApplication, 'id' | 'business_name'> })[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('dealer_documents')
      .select('*, application:application_id(id, business_name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.verified !== undefined) {
      query = query.eq('is_verified', filters.verified);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      documents: (data || []) as unknown as (DealerDocument & { application: Pick<DealerApplication, 'id' | 'business_name'> })[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getAllAuditLog(filters: { page?: number; limit?: number } = {}): Promise<{
    entries: (DealerAuditLogEntry & { application: Pick<DealerApplication, 'id' | 'business_name'> })[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('dealer_audit_log')
      .select('*, application:application_id(id, business_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      entries: (data || []) as unknown as (DealerAuditLogEntry & { application: Pick<DealerApplication, 'id' | 'business_name'> })[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getAllEmails(filters: { page?: number; limit?: number } = {}): Promise<{
    emails: (DealerEmailLogEntry & { application: Pick<DealerApplication, 'id' | 'business_name'> })[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('dealer_emails')
      .select('*, application:application_id(id, business_name)', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      emails: (data || []) as unknown as (DealerEmailLogEntry & { application: Pick<DealerApplication, 'id' | 'business_name'> })[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },
};
