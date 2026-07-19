import { supabase } from '../client';
import type {
  CrmLead,
  CrmLeadWithAssignee,
  CrmActivity,
  Order,
} from '../database.types';

export interface CrmStaffMember {
  id: string;
  full_name: string | null;
  email: string;
}

export interface CrmFollowUp extends CrmActivity {
  lead: Pick<CrmLead, 'id' | 'name' | 'email' | 'status'> | null;
}


export type CrmLeadStatus = CrmLead['status'];
export type CrmLeadSource = CrmLead['source'];
export type CrmActivityType = CrmActivity['activity_type'];

export interface CrmLeadFilters {
  search?: string;
  status?: CrmLeadStatus;
  source?: CrmLeadSource;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface CrmLeadInput {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  notes?: string | null;
  source?: CrmLeadSource;
}

export interface CrmActivityInput {
  activity_type?: CrmActivityType;
  body: string;
  due_at?: string | null;
}

const ASSIGNEE_SELECT =
  '*, assignee:profiles!crm_leads_assigned_to_fkey(id, full_name, email)';

export const crmApi = {
  async getLeads(filters: CrmLeadFilters = {}): Promise<{
    leads: CrmLeadWithAssignee[];
    count: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('crm_leads')
      .select(ASSIGNEE_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`,
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      leads: (data || []) as unknown as CrmLeadWithAssignee[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getLead(id: string): Promise<CrmLeadWithAssignee | null> {
    const { data, error } = await supabase
      .from('crm_leads')
      .select(ASSIGNEE_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as CrmLeadWithAssignee) || null;
  },

  async getStatusCounts(): Promise<Record<CrmLeadStatus, number>> {
    const counts: Record<CrmLeadStatus, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    };

    const statuses: CrmLeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];
    await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabase
          .from('crm_leads')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);
        counts[status] = count || 0;
      }),
    );

    return counts;
  },

  async createLead(input: CrmLeadInput): Promise<CrmLead> {
    const { data, error } = await supabase
      .from('crm_leads')
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        company: input.company ?? null,
        subject: input.subject ?? null,
        notes: input.notes ?? null,
        source: input.source ?? 'manual',
      } as never)
      .select('*')
      .single();
    if (error) throw error;
    return data as CrmLead;
  },

  async updateStatus(id: string, status: CrmLeadStatus): Promise<void> {
    const { error } = await supabase
      .from('crm_leads')
      .update({ status } as never)
      .eq('id', id);
    if (error) throw error;
  },

  async assignLead(id: string, assignedTo: string | null): Promise<void> {
    const { error } = await supabase
      .from('crm_leads')
      .update({ assigned_to: assignedTo } as never)
      .eq('id', id);
    if (error) throw error;
  },


  async getActivities(leadId: string): Promise<CrmActivity[]> {
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CrmActivity[];
  },

  async addActivity(leadId: string, input: CrmActivityInput): Promise<CrmActivity> {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('crm_activities')
      .insert({
        lead_id: leadId,
        admin_id: userData.user?.id ?? null,
        activity_type: input.activity_type ?? 'note',
        body: input.body,
        due_at: input.due_at ?? null,
      } as never)
      .select('*')
      .single();
    if (error) throw error;

    // Logging a call/email/meeting counts as making contact.
    if (['call', 'email', 'meeting'].includes(input.activity_type ?? 'note')) {
      await supabase
        .from('crm_leads')
        .update({ last_contacted_at: new Date().toISOString() } as never)
        .eq('id', leadId);
    }


    return data as CrmActivity;
  },

  // ==================== STAFF / ASSIGNMENT ====================

  async getStaff(): Promise<CrmStaffMember[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .order('full_name', { ascending: true });
    if (error) throw error;
    return (data || []) as CrmStaffMember[];
  },

  // ==================== 360° VIEW ====================

  // Orders linked to this lead's email (customer history at a glance).
  async getLinkedOrders(email: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data || []) as Order[];
  },

  // ==================== PIPELINE (KANBAN) ====================

  // Fetch all non-archived leads grouped for the board. Capped per column
  // to keep the board responsive; the table view remains the paginated source.
  async getBoard(limitPerStatus = 50): Promise<Record<CrmLeadStatus, CrmLeadWithAssignee[]>> {
    const statuses: CrmLeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];
    const board = {
      new: [],
      contacted: [],
      qualified: [],
      won: [],
      lost: [],
    } as Record<CrmLeadStatus, CrmLeadWithAssignee[]>;

    await Promise.all(
      statuses.map(async (status) => {
        const { data, error } = await supabase
          .from('crm_leads')
          .select(ASSIGNEE_SELECT)
          .eq('status', status)
          .order('created_at', { ascending: false })
          .limit(limitPerStatus);
        if (error) throw error;
        board[status] = (data || []) as unknown as CrmLeadWithAssignee[];
      }),
    );

    return board;
  },

  // ==================== FOLLOW-UPS ====================

  async getOpenFollowUps(): Promise<CrmFollowUp[]> {
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*, lead:crm_leads!crm_activities_lead_id_fkey(id, name, email, status)')
      .eq('activity_type', 'follow_up')
      .eq('completed', false)
      .not('due_at', 'is', null)
      .order('due_at', { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as CrmFollowUp[];
  },

  async completeFollowUp(activityId: string): Promise<void> {
    const { error } = await supabase
      .from('crm_activities')
      .update({ completed: true } as never)
      .eq('id', activityId);
    if (error) throw error;
  },
};

