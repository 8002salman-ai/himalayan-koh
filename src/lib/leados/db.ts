import { getSupabaseAdmin } from '@/lib/stripe/server/supabaseAdmin';
import type {
  LeadOSProject,
  SavedLeadRecord,
  LeadOSScoreWeight,
  NormalizedLead,
  ProjectFitResult,
} from './types';
import { DEFAULT_SCORE_WEIGHTS } from './scoring';

export const HK_DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
export const HK_DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000002';

export const HK_DEFAULT_PROJECT: LeadOSProject = {
  id: HK_DEFAULT_PROJECT_ID,
  workspaceId: HK_DEFAULT_WORKSPACE_ID,
  name: 'Himalayan Koh — B2B Salt & Minerals',
  website: 'https://preview.himalayankoh.com',
  shortDescription:
    'Wholesale & B2B distribution of Himalayan rock salt animal licks and bulk culinary salt.',
  productService:
    'Natural animal mineral salt licks (rope, carved, block), bulk organic pink salt, spa/bath minerals.',
  targetCustomerDescription:
    'Feed and farm supply retailers, livestock & equine ranches, animal health stores, food co-ops, and bulk spice/salt distributors.',
  industries: [
    'Agriculture',
    'Livestock & Equine',
    'Farm Supplies',
    'Wholesale & Distribution',
    'Specialty Retail',
  ],
  businessCategories: [
    'Feed Store',
    'Farm Supply',
    'Equestrian Store',
    'Veterinary',
    'Supermarket',
  ],
  preferredLocations: [
    'Texas',
    'Montana',
    'Wyoming',
    'Kansas',
    'Nebraska',
    'Oklahoma',
    'Colorado',
    'Iowa',
    'Kentucky',
  ],
  countries: ['United States', 'US'],
  targetBusinessSize: 'SMB to Mid-Market (Retailers, Distributors, Cooperatives)',
  positiveKeywords: [
    'salt lick',
    'feed',
    'farm',
    'tack',
    'equine',
    'livestock',
    'ranch',
    'mineral',
    'wholesale',
    'supply',
    'grain',
    'agriculture',
  ],
  negativeKeywords: ['fast food', 'convenience store', 'gas station', 'car repair', 'pharmacy'],
  idealCustomerProfile:
    'Commercial feed mills, farm supply cooperatives, independent tack & feed shops, livestock ranches, and specialty grocery distributors evaluating Himalayan mineral salt products.',
  notes: 'Authoritative Himalayan Koh B2B ICP project.',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  leadCount: 0,
};

// In-memory fallback in case Supabase tables have not yet been migrated on the remote database
const inMemoryStore = {
  projects: new Map<string, LeadOSProject>([[HK_DEFAULT_PROJECT_ID, HK_DEFAULT_PROJECT]]),
  savedLeads: new Map<string, SavedLeadRecord>(),
  projectLeads: new Map<string, Set<string>>(), // projectId -> Set of leadIds
  searches: [] as Array<{ id: string; category: string; location: string; resultsCount: number; createdAt: string }>,
  scoreWeights: { ...DEFAULT_SCORE_WEIGHTS },
};

/**
 * Ensures the default workspace and project exist in Supabase (or memory).
 */
export async function ensureDefaultProject(): Promise<LeadOSProject> {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Ensure workspace
    await (supabase as any)
      .from('leados_workspaces')
      .upsert(
        {
          id: HK_DEFAULT_WORKSPACE_ID,
          name: 'Himalayan Koh LeadOS',
          slug: 'himalayan-koh',
        },
        { onConflict: 'id' }
      );

    // 2. Fetch or insert default project
    const { data: existing } = await (supabase as any)
      .from('leados_projects')
      .select('*')
      .eq('id', HK_DEFAULT_PROJECT_ID)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        workspaceId: existing.workspace_id,
        name: existing.name,
        website: existing.website,
        shortDescription: existing.short_description,
        productService: existing.product_service,
        targetCustomerDescription: existing.target_customer_description,
        industries: existing.industries || [],
        businessCategories: (existing.business_categories || []).filter((category: string) => !/pet\s*shop|pet\s*store/i.test(category)),
        preferredLocations: existing.preferred_locations || [],
        countries: existing.countries || [],
        targetBusinessSize: existing.target_business_size,
        positiveKeywords: existing.positive_keywords || [],
        negativeKeywords: existing.negative_keywords || [],
        idealCustomerProfile: existing.ideal_customer_profile,
        notes: existing.notes,
        status: existing.status,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from('leados_projects')
      .insert({
        id: HK_DEFAULT_PROJECT.id,
        workspace_id: HK_DEFAULT_PROJECT.workspaceId,
        name: HK_DEFAULT_PROJECT.name,
        website: HK_DEFAULT_PROJECT.website,
        short_description: HK_DEFAULT_PROJECT.shortDescription,
        product_service: HK_DEFAULT_PROJECT.productService,
        target_customer_description: HK_DEFAULT_PROJECT.targetCustomerDescription,
        industries: HK_DEFAULT_PROJECT.industries,
        business_categories: HK_DEFAULT_PROJECT.businessCategories,
        preferred_locations: HK_DEFAULT_PROJECT.preferredLocations,
        countries: HK_DEFAULT_PROJECT.countries,
        target_business_size: HK_DEFAULT_PROJECT.targetBusinessSize,
        positive_keywords: HK_DEFAULT_PROJECT.positiveKeywords,
        negative_keywords: HK_DEFAULT_PROJECT.negativeKeywords,
        ideal_customer_profile: HK_DEFAULT_PROJECT.idealCustomerProfile,
        notes: HK_DEFAULT_PROJECT.notes,
        status: HK_DEFAULT_PROJECT.status,
      })
      .select()
      .single();

    if (!insertErr && inserted) {
      return {
        id: inserted.id,
        workspaceId: inserted.workspace_id,
        name: inserted.name,
        website: inserted.website,
        shortDescription: inserted.short_description,
        productService: inserted.product_service,
        targetCustomerDescription: inserted.target_customer_description,
        industries: inserted.industries || [],
        businessCategories: inserted.business_categories || [],
        preferredLocations: inserted.preferred_locations || [],
        countries: inserted.countries || [],
        targetBusinessSize: inserted.target_business_size,
        positiveKeywords: inserted.positive_keywords || [],
        negativeKeywords: inserted.negative_keywords || [],
        idealCustomerProfile: inserted.ideal_customer_profile,
        notes: inserted.notes,
        status: inserted.status,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
    }
  } catch (err) {
    throw new Error(`LeadOS persistence unavailable: ${err instanceof Error ? err.message : 'database error'}`);
  }

  throw new Error('LeadOS default project could not be persisted.');
}

/**
 * Lists all projects.
 */
export async function listProjects(): Promise<LeadOSProject[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: projects, error } = await (supabase as any)
      .from('leados_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(projects) && projects.length > 0) {
      return projects.map((p) => ({
        id: p.id,
        workspaceId: p.workspace_id,
        name: p.name,
        website: p.website,
        shortDescription: p.short_description,
        productService: p.product_service,
        targetCustomerDescription: p.target_customer_description,
        industries: p.industries || [],
        businessCategories: p.business_categories || [],
        preferredLocations: p.preferred_locations || [],
        countries: p.countries || [],
        targetBusinessSize: p.target_business_size,
        positiveKeywords: p.positive_keywords || [],
        negativeKeywords: p.negative_keywords || [],
        idealCustomerProfile: p.ideal_customer_profile,
        notes: p.notes,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        leadCount: 0,
      }));
    }
  } catch (error) {
    throw new Error(`LeadOS project read failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  throw new Error('LeadOS project read failed.');
}

/**
 * Gets single project by ID.
 */
export async function getProjectById(id: string): Promise<LeadOSProject | null> {
  const all = await listProjects();
  return all.find((p) => p.id === id) || null;
}

/**
 * Creates or updates a project.
 */
export async function saveProject(project: Partial<LeadOSProject> & { name: string }): Promise<LeadOSProject> {
  const id = project.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const formatted: LeadOSProject = {
    id,
    workspaceId: project.workspaceId || HK_DEFAULT_WORKSPACE_ID,
    name: project.name,
    website: project.website || null,
    shortDescription: project.shortDescription || null,
    productService: project.productService || null,
    targetCustomerDescription: project.targetCustomerDescription || null,
    industries: project.industries || [],
    businessCategories: project.businessCategories || [],
    preferredLocations: project.preferredLocations || [],
    countries: project.countries || [],
    targetBusinessSize: project.targetBusinessSize || null,
    positiveKeywords: project.positiveKeywords || [],
    negativeKeywords: project.negativeKeywords || [],
    idealCustomerProfile: project.idealCustomerProfile || null,
    notes: project.notes || null,
    status: project.status || 'active',
    createdAt: project.createdAt || now,
    updatedAt: now,
  };

  try {
    const supabase = getSupabaseAdmin();
    await (supabase as any).from('leados_projects').upsert({
      id: formatted.id,
      workspace_id: formatted.workspaceId,
      name: formatted.name,
      website: formatted.website,
      short_description: formatted.shortDescription,
      product_service: formatted.productService,
      target_customer_description: formatted.targetCustomerDescription,
      industries: formatted.industries,
      business_categories: formatted.businessCategories,
      preferred_locations: formatted.preferredLocations,
      countries: formatted.countries,
      target_business_size: formatted.targetBusinessSize,
      positive_keywords: formatted.positiveKeywords,
      negative_keywords: formatted.negativeKeywords,
      ideal_customer_profile: formatted.idealCustomerProfile,
      notes: formatted.notes,
      status: formatted.status,
      updated_at: formatted.updatedAt,
    });
  } catch (error) {
    throw new Error(`LeadOS project save failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  inMemoryStore.projects.set(id, formatted);
  return formatted;
}

/**
 * Saves a discovered lead to the Saved Leads library.
 */
export async function saveLeadToLibrary(
  lead: NormalizedLead & {
    opportunityScore?: number;
    opportunitySignals?: string[];
    projectFitScore?: number;
    projectFitReasons?: string[];
    outreachAngles?: string[];
  },
  projectId?: string
): Promise<SavedLeadRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: SavedLeadRecord = {
    id,
    workspaceId: HK_DEFAULT_WORKSPACE_ID,
    businessName: lead.businessName,
    category: lead.category || null,
    address: lead.address || null,
    city: lead.city || null,
    region: lead.region || null,
    country: lead.country || null,
    website: lead.website || null,
    phone: lead.phone || null,
    email: lead.email || null,
    opportunityScore: lead.opportunityScore ?? null,
    opportunitySignals: lead.opportunitySignals || null,
    status: 'new',
    starred: false,
    tags: lead.category ? [lead.category] : [],
    notes: null,
    osmUrl: lead.osmUrl || null,
    discoveredAt: now,
    createdAt: now,
    projects: projectId
      ? [
          {
            leadId: id,
            projectId,
            projectName: (await getProjectById(projectId))?.name || 'Assigned Project',
            projectFitScore: lead.projectFitScore ?? null,
          },
        ]
      : [],
  };

  try {
    const supabase = getSupabaseAdmin();
    const provider = record.osmUrl ? 'openstreetmap' : (lead.dataSource || 'unknown');
    const providerRecordId = lead.osmType && lead.osmId ? `${lead.osmType}/${lead.osmId}` : null;
    const existingQuery = providerRecordId
      ? await (supabase as any)
          .from('leados_leads')
          .select('id, status, notes, starred, tags')
          .eq('workspace_id', record.workspaceId)
          .eq('data_source', provider)
          .eq('osm_type', lead.osmType)
          .eq('osm_id', lead.osmId)
          .maybeSingle()
      : { data: null, error: null };
    if (existingQuery.error) throw existingQuery.error;
    const existing = existingQuery.data;
    const leadPayload = {
      workspace_id: record.workspaceId,
      business_name: record.businessName,
      category: record.category,
      address: record.address,
      city: record.city,
      region: record.region,
      country: record.country,
      website: record.website,
      phone: record.phone,
      email: record.email,
      email_source: record.emailSource || (record.email ? 'discovered_osm' : null),
      latitude: lead.latitude,
      longitude: lead.longitude,
      osm_type: lead.osmType,
      osm_id: lead.osmId,
      osm_url: lead.osmUrl,
      data_source: provider,
      opportunity_score: record.opportunityScore,
      opportunity_signals: record.opportunitySignals,
      tags: record.tags,
    };
    if (existing) {
      await (supabase as any).from('leados_leads').update(leadPayload).eq('id', existing.id).eq('workspace_id', record.workspaceId);
      record.id = existing.id;
      record.status = existing.status || record.status;
      record.notes = existing.notes || record.notes;
      record.starred = Boolean(existing.starred);
      record.tags = existing.tags || record.tags;
    } else {
      await (supabase as any).from('leados_leads').insert({
      id: record.id,
      workspace_id: record.workspaceId,
      business_name: record.businessName,
      category: record.category,
      address: record.address,
      city: record.city,
      region: record.region,
      country: record.country,
      website: record.website,
      phone: record.phone,
      email: record.email,
      email_source: record.emailSource || (record.email ? 'discovered_osm' : null),
      latitude: lead.latitude,
      longitude: lead.longitude,
      osm_type: lead.osmType,
      osm_id: lead.osmId,
      osm_url: lead.osmUrl,
      data_source: lead.dataSource || 'openstreetmap',
      opportunity_score: record.opportunityScore,
      opportunity_signals: record.opportunitySignals,
      status: record.status,
      starred: record.starred,
      tags: record.tags,
      notes: record.notes,
      });
    }

    if (projectId) {
      await (supabase as any).from('leados_project_leads').upsert({
        project_id: projectId,
        lead_id: record.id,
        project_fit_score: lead.projectFitScore ?? null,
        project_fit_reasons: lead.projectFitReasons || null,
        outreach_angles: lead.outreachAngles || null,
      }, { onConflict: 'project_id,lead_id' });
    }
  } catch (error) {
    throw new Error(`LeadOS lead save failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  inMemoryStore.savedLeads.set(record.id, record);
  if (projectId) {
    if (!inMemoryStore.projectLeads.has(projectId)) {
      inMemoryStore.projectLeads.set(projectId, new Set());
    }
    inMemoryStore.projectLeads.get(projectId)!.add(id);
  }

  return record;
}

/**
 * Lists saved leads with filtering and pagination.
 */
export async function listSavedLeads(options?: {
  search?: string;
  status?: string;
  projectId?: string;
  limit?: number;
  page?: number;
}): Promise<{ leads: SavedLeadRecord[]; total: number }> {
  const limit = options?.limit || 50;
  const page = options?.page || 1;

  try {
    const supabase = getSupabaseAdmin();
    let query = (supabase as any)
      .from('leados_leads')
      .select('*, leados_project_leads(project_id, project_fit_score)', { count: 'exact' });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.search) {
      query = query.ilike('business_name', `%${options.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (!error && Array.isArray(data)) {
      const mapped: SavedLeadRecord[] = data.map((d: any) => ({
        id: d.id,
        workspaceId: d.workspace_id,
        businessName: d.business_name,
        category: d.category,
        address: d.address,
        city: d.city,
        region: d.region,
        country: d.country,
        website: d.website,
        phone: d.phone,
        email: d.email,
        emailSource: d.email_source || (d.email ? 'discovered_osm' : undefined),
        opportunityScore: d.opportunity_score,
        opportunitySignals: d.opportunity_signals,
        status: d.status,
        starred: d.starred,
        tags: d.tags,
        notes: d.notes,
        osmUrl: d.osm_url,
        discoveredAt: d.discovered_at || d.created_at,
        createdAt: d.created_at,
        projects: (d.leados_project_leads || []).map((pl: any) => ({
          leadId: d.id,
          projectId: pl.project_id,
          projectName: 'Project',
          projectFitScore: pl.project_fit_score,
        })),
      }));

      return { leads: mapped, total: count || mapped.length };
    }
  } catch (error) {
    throw new Error(`LeadOS lead read failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  let list = Array.from(inMemoryStore.savedLeads.values());
  if (options?.status && options.status !== 'all') {
    list = list.filter((l) => l.status === options.status);
  }
  if (options?.search) {
    const s = options.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.businessName.toLowerCase().includes(s) ||
        (l.city && l.city.toLowerCase().includes(s)) ||
        (l.category && l.category.toLowerCase().includes(s))
    );
  }

  const start = (page - 1) * limit;
  return {
    leads: list.slice(start, start + limit),
    total: list.length,
  };
}

/**
 * Updates lead status, notes, tags, or starred status.
 */
export async function updateSavedLead(
  id: string,
  patch: Partial<SavedLeadRecord>
): Promise<SavedLeadRecord | null> {
  try {
    const supabase = getSupabaseAdmin();
    const updatePayload: Record<string, unknown> = {};
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.starred !== undefined) updatePayload.starred = patch.starred;
    if (patch.notes !== undefined) updatePayload.notes = patch.notes;
    if (patch.tags !== undefined) updatePayload.tags = patch.tags;
    if (patch.email !== undefined) {
      updatePayload.email = patch.email;
      updatePayload.email_source = patch.emailSource || 'manually_entered';
    }
    if (patch.phone !== undefined) updatePayload.phone = patch.phone;
    if (patch.website !== undefined) updatePayload.website = patch.website;

    const { data: updatedRows, error } = await (supabase as any)
      .from('leados_leads')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', HK_DEFAULT_WORKSPACE_ID)
      .select('*');
    if (error) throw error;
    if (!updatedRows?.length) return null;
  } catch (error) {
    throw new Error(`LeadOS lead update failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  const existing = inMemoryStore.savedLeads.get(id);
  if (existing) {
    const updated = { ...existing, ...patch };
    inMemoryStore.savedLeads.set(id, updated);
    return updated;
  }
  return null;
}

/**
 * Deletes a saved lead.
 */
export async function deleteSavedLead(id: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: deletedRows, error } = await (supabase as any)
      .from('leados_leads')
      .delete()
      .eq('id', id)
      .eq('workspace_id', HK_DEFAULT_WORKSPACE_ID)
      .select('id');
    if (error) throw error;
    if (!deletedRows?.length) return false;
  } catch (error) {
    throw new Error(`LeadOS lead delete failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  inMemoryStore.savedLeads.delete(id);
  return true;
}

/**
 * Records a search execution into search history.
 */
export async function recordSearchExecution(entry: {
  category: string;
  location: string;
  resultsCount: number;
}): Promise<void> {
  const record = {
    id: crypto.randomUUID(),
    category: entry.category,
    location: entry.location,
    resultsCount: entry.resultsCount,
    createdAt: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    await (supabase as any).from('leados_searches').insert({
      id: record.id,
      workspace_id: HK_DEFAULT_WORKSPACE_ID,
      query_category: record.category,
      query_location: record.location,
      results_count: record.resultsCount,
    });
  } catch (error) {
    throw new Error(`LeadOS search history write failed: ${error instanceof Error ? error.message : 'database error'}`);
  }

  inMemoryStore.searches.unshift(record);
  if (inMemoryStore.searches.length > 20) {
    inMemoryStore.searches.pop();
  }
}

/**
 * Returns dashboard overview stats.
 */
export async function getLeadOSOverviewStats() {
  const supabase = getSupabaseAdmin();
  const base = () => (supabase as any).from('leados_leads').select('id', { count: 'exact', head: true }).eq('workspace_id', HK_DEFAULT_WORKSPACE_ID);
  const [total, high, contacted, pipeline, activity] = await Promise.all([
    base(),
    base().gte('opportunity_score', 70),
    base().eq('status', 'contacted'),
    base().in('status', ['shortlisted', 'qualified']),
    (supabase as any).from('leados_audit_logs').select('action, details, created_at').eq('workspace_id', HK_DEFAULT_WORKSPACE_ID).order('created_at', { ascending: false }).limit(5),
  ]);
  for (const result of [total, high, contacted, pipeline, activity]) if (result.error) throw result.error;
  const projects = await listProjects();
  return {
    savedLeadsCount: total.count || 0,
    highOpportunityCount: high.count || 0,
    contactedCount: contacted.count || 0,
    inPipelineCount: pipeline.count || 0,
    activeProjectsCount: projects.length,
    searchesCount: 0,
    defaultProject: projects.find((p) => p.id === HK_DEFAULT_PROJECT_ID) || projects[0] || null,
    recentActivity: (activity.data || []).map((row: any) => ({
      description: String(row.details?.action || row.action || 'LeadOS activity'),
      time: row.created_at,
    })),
  };
}
