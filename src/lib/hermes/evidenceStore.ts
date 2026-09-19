import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import type {
  EvidenceRecord,
  EvidenceStatus,
  NormalizedEvidence,
} from './types';

// In-memory fallback for environments where Supabase is not reached (e.g. offline testing)
const memoryStore = new Map<string, EvidenceRecord>();

export interface IngestStoreResult {
  status: 'CREATED' | 'ALREADY_EXISTS';
  id: string;
  dedupe_key: string;
  observed_at: string;
  record: EvidenceRecord;
}

export async function insertEvidence(
  evidence: NormalizedEvidence
): Promise<IngestStoreResult> {
  const now = new Date().toISOString();

  // Try Supabase first
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = getSupabaseAdmin();

    // Check for existing dedupe_key (Idempotency)
    const { data: existing, error: findError } = await supabase
      .from('hermes_evidence')
      .select('*')
      .eq('dedupe_key', evidence.dedupe_key)
      .maybeSingle();

    if (!findError && existing) {
      return {
        status: 'ALREADY_EXISTS',
        id: existing.id,
        dedupe_key: existing.dedupe_key,
        observed_at: existing.observed_at,
        record: existing as EvidenceRecord,
      };
    }

    // Insert new record
    const { data: inserted, error: insertError } = await supabase
      .from('hermes_evidence')
      .insert({
        source: evidence.source,
        type: evidence.type,
        entity: evidence.entity || {},
        title: evidence.title,
        summary: evidence.summary,
        evidence: evidence.evidence || [],
        confidence: evidence.confidence,
        priority: evidence.priority,
        recommended_action: evidence.recommended_action || null,
        observed_at: evidence.observed_at,
        dedupe_key: evidence.dedupe_key,
        metadata: evidence.metadata || {},
        status: 'new',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      // Check for concurrent insert race (Postgres unique constraint code 23505)
      if (insertError.code === '23505') {
        const { data: raceRecord } = await supabase
          .from('hermes_evidence')
          .select('*')
          .eq('dedupe_key', evidence.dedupe_key)
          .maybeSingle();

        if (raceRecord) {
          return {
            status: 'ALREADY_EXISTS',
            id: raceRecord.id,
            dedupe_key: raceRecord.dedupe_key,
            observed_at: raceRecord.observed_at,
            record: raceRecord as EvidenceRecord,
          };
        }
      }
      throw new Error(`Supabase insert failed: ${insertError.message}`);
    }

    const record = inserted as EvidenceRecord;
    memoryStore.set(evidence.dedupe_key, record);
    return {
      status: 'CREATED',
      id: record.id,
      dedupe_key: record.dedupe_key,
      observed_at: record.observed_at,
      record,
    };
  } catch (err) {
    // If Supabase is offline or unconfigured, fallback to in-memory store
    if (memoryStore.has(evidence.dedupe_key)) {
      const existing = memoryStore.get(evidence.dedupe_key)!;
      return {
        status: 'ALREADY_EXISTS',
        id: existing.id,
        dedupe_key: existing.dedupe_key,
        observed_at: existing.observed_at,
        record: existing,
      };
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record: EvidenceRecord = {
      ...evidence,
      id,
      status: 'new',
      created_at: now,
      updated_at: now,
    };
    memoryStore.set(evidence.dedupe_key, record);

    return {
      status: 'CREATED',
      id,
      dedupe_key: evidence.dedupe_key,
      observed_at: evidence.observed_at,
      record,
    };
  }
}

export interface ListEvidenceFilter {
  type?: string;
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
}

export interface ListEvidenceResult {
  items: EvidenceRecord[];
  total: number;
  countsByType: Record<string, number>;
  countsByStatus: Record<string, number>;
}

export async function listEvidence(
  filter: ListEvidenceFilter = {}
): Promise<ListEvidenceResult> {
  const limit = Math.min(Math.max(1, filter.limit || 100), 500);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = getSupabaseAdmin();

    let query = supabase.from('hermes_evidence').select('*', { count: 'exact' });

    if (filter.type && filter.type !== 'all') {
      // Support comma-separated types (e.g. for tabs grouping multiple types)
      const types = filter.type.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length === 1) {
        query = query.eq('type', types[0]);
      } else if (types.length > 1) {
        query = query.in('type', types);
      }
    }

    if (filter.status && filter.status !== 'all') {
      query = query.eq('status', filter.status);
    }

    if (filter.source && filter.source !== 'all') {
      query = query.eq('source', filter.source);
    }

    if (filter.search) {
      query = query.ilike('title', `%${filter.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (data || []) as EvidenceRecord[];

    // Compute counts across all records
    const { data: allSummary } = await supabase
      .from('hermes_evidence')
      .select('type, status');

    const countsByType: Record<string, number> = {};
    const countsByStatus: Record<string, number> = {};

    for (const row of allSummary || []) {
      countsByType[row.type] = (countsByType[row.type] || 0) + 1;
      countsByStatus[row.status] = (countsByStatus[row.status] || 0) + 1;
    }

    return {
      items,
      total: count ?? items.length,
      countsByType,
      countsByStatus,
    };
  } catch {
    // Memory fallback
    let items = Array.from(memoryStore.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const countsByType: Record<string, number> = {};
    const countsByStatus: Record<string, number> = {};
    for (const r of items) {
      countsByType[r.type] = (countsByType[r.type] || 0) + 1;
      countsByStatus[r.status] = (countsByStatus[r.status] || 0) + 1;
    }

    if (filter.type && filter.type !== 'all') {
      const types = filter.type.split(',').map((t) => t.trim()).filter(Boolean);
      items = items.filter((i) => types.includes(i.type));
    }
    if (filter.status && filter.status !== 'all') {
      items = items.filter((i) => i.status === filter.status);
    }
    if (filter.source && filter.source !== 'all') {
      items = items.filter((i) => i.source === filter.source);
    }
    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(s) || i.summary.toLowerCase().includes(s));
    }

    return {
      items: items.slice(0, limit),
      total: items.length,
      countsByType,
      countsByStatus,
    };
  }
}

export async function updateEvidenceStatus(
  id: string,
  status: EvidenceStatus,
  reviewNote?: string | null
): Promise<{ ok: boolean; record?: EvidenceRecord }> {
  const now = new Date().toISOString();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = getSupabaseAdmin();
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: now,
    };
    if (reviewNote !== undefined) {
      updatePayload.review_note = reviewNote;
    }

    const { data, error } = await supabase
      .from('hermes_evidence')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ok: true, record: data as EvidenceRecord };
  } catch {
    // Memory fallback
    for (const r of memoryStore.values()) {
      if (r.id === id) {
        r.status = status;
        if (reviewNote !== undefined) r.review_note = reviewNote;
        r.updated_at = now;
        return { ok: true, record: r };
      }
    }
    return { ok: false };
  }
}
