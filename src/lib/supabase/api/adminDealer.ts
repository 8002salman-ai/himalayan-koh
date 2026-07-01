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
};
