import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Contact,
  DownloadCloud,
  KanbanSquare,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  Table as TableIcon,
  UserCircle2,
} from 'lucide-react';
import {
  crmApi,
  CrmLeadStatus,
  CrmStaffMember,
  CrmFollowUp,
} from '../../lib/supabase/api/crm';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import {
  fetchHubspotStatus,
  syncLeadToHubspot,
  importFromHubspot,
} from '../../lib/hubspot/adminClient';
import { getErrorMessage } from '../../lib/errors';
import { useToast } from '../../context/ToastContext';
import type { CrmLeadWithAssignee, CrmActivity, Order } from '../../lib/supabase/database.types';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminField,
  AdminInput,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminTable,
  AdminTableSkeleton,
} from '../../components/admin/AdminUI';
import {
  BUTTON,
  CHIP,
  INPUT,
  MICRO_LABEL,
  ROW,
  SELECT,
  SURFACE,
  type ChipTone,
} from '../../components/admin/adminTheme';

/**
 * Lead pipeline.
 *
 * One status vocabulary drives the pills, the table, the board columns and the
 * lead drawer, and one place owns each piece of state: this component owns the
 * query (search/filter/page) and the selected lead; `TableView` and `BoardView`
 * are pure renderings of what it fetched, and the drawer/modal only report the
 * actions they took. That is what keeps the counts in the pills, the board
 * columns and the table from disagreeing with each other.
 */

const STATUS_META: Record<CrmLeadStatus, { label: string; tone: ChipTone; dot: string }> = {
  new: { label: 'New', tone: 'info', dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', tone: 'warning', dot: 'bg-amber-500' },
  qualified: { label: 'Qualified', tone: 'brand', dot: 'bg-violet-500' },
  won: { label: 'Won', tone: 'success', dot: 'bg-emerald-500' },
  lost: { label: 'Lost', tone: 'muted', dot: 'bg-slate-400' },
};

const STATUS_ORDER: CrmLeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

const SOURCE_LABELS: Record<string, string> = {
  contact_form: 'Contact form',
  manual: 'Manual',
  other: 'Other',
};

/** The status pill / filter vocabulary, so pills and selects cannot drift apart. */
const STATUS_SELECT = `${SELECT} w-full`;
const STATUS_CHIP_CONTROL =
  'cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-himalayan/25';

const filterPill = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
    active
      ? 'border-himalayan bg-himalayan text-white'
      : 'border-admin-line bg-admin-surface text-admin-muted hover:border-himalayan hover:text-admin-ink'
  }`;

function staffName(staff: CrmStaffMember[], id: string | null): string {
  if (!id) return 'Unassigned';
  const match = staff.find((s) => s.id === id);
  return match?.full_name || match?.email || 'Unassigned';
}

export default function AdminCRM() {
  const toast = useToast();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [staff, setStaff] = useState<CrmStaffMember[]>([]);
  const [counts, setCounts] = useState<Record<CrmLeadStatus, number> | null>(null);
  const [followUps, setFollowUps] = useState<CrmFollowUp[]>([]);

  // Table state
  const [leads, setLeads] = useState<CrmLeadWithAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CrmLeadStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Board state
  const [board, setBoard] = useState<Record<CrmLeadStatus, CrmLeadWithAssignee[]> | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);

  const [selectedLead, setSelectedLead] = useState<CrmLeadWithAssignee | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [hubspotEnabled, setHubspotEnabled] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchHubspotStatus().then((enabled) => {
      if (active) setHubspotEnabled(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setLeads([]);
      setLoading(false);
      return;
    }
    try {
      setFetchError(null);
      const result = await crmApi.getLeads({
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 15,
      });
      setLeads(result.leads);
      setTotalPages(result.totalPages);
      setTotalCount(result.count);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load leads.'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  const fetchBoard = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setBoardLoading(true);
    try {
      setBoard(await crmApi.getBoard());
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load board.'));
    } finally {
      setBoardLoading(false);
    }
  }, [toast]);

  const fetchMeta = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const [c, s, f] = await Promise.all([
        crmApi.getStatusCounts(),
        crmApi.getStaff(),
        crmApi.getOpenFollowUps(),
      ]);
      setCounts(c);
      setStaff(s);
      setFollowUps(f);
    } catch {
      // Counts, staff and follow-ups are supporting context for the pipeline
      // itself; a failure here leaves the previous values rather than
      // blanking them or inventing zeroes.
    }
  }, []);

  useEffect(() => {
    if (view === 'table') fetchLeads();
  }, [fetchLeads, view]);

  useEffect(() => {
    if (view === 'board') fetchBoard();
  }, [fetchBoard, view]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const refreshAll = useCallback(() => {
    fetchMeta();
    if (view === 'table') fetchLeads();
    else fetchBoard();
  }, [fetchMeta, fetchLeads, fetchBoard, view]);

  const handleStatusChange = async (lead: CrmLeadWithAssignee, status: CrmLeadStatus) => {
    try {
      await crmApi.updateStatus(lead.id, status);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
      if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, status });
      toast.success('Lead status updated');
      fetchMeta();
      if (view === 'board') fetchBoard();
      // Best-effort: keep HubSpot in sync with the new status.
      if (hubspotEnabled) {
        syncLeadToHubspot({
          email: lead.email,
          name: lead.name,
          phone: lead.phone,
          company: lead.company,
          status,
          notes: lead.notes,
        }).then((r) => {
          if (!r.ok) toast.error(`Saved locally, but HubSpot sync failed: ${r.error}`);
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update status.'));
    }
  };

  const handleImportHubspot = async () => {
    setImporting(true);
    try {
      const { imported, skipped } = await importFromHubspot();
      toast.success(
        imported > 0
          ? `Imported ${imported} contact${imported === 1 ? '' : 's'} from HubSpot${skipped ? ` (${skipped} already in CRM)` : ''}.`
          : 'No new HubSpot contacts to import.',
      );
      setPage(1);
      refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err, 'HubSpot import failed.'));
    } finally {
      setImporting(false);
    }
  };

  const handleAssign = async (lead: CrmLeadWithAssignee, assignedTo: string | null) => {
    try {
      await crmApi.assignLead(lead.id, assignedTo);
      const patch = { assigned_to: assignedTo };
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, ...patch } : l)));
      if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, ...patch });
      toast.success(assignedTo ? 'Lead assigned' : 'Lead unassigned');
      if (view === 'board') fetchBoard();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not assign lead.'));
    }
  };

  const dueFollowUps = useMemo(() => {
    const now = Date.now();
    return followUps.filter(
      (f) => f.due_at && new Date(f.due_at).getTime() <= now + 24 * 60 * 60 * 1000,
    );
  }, [followUps]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Growth"
        title="CRM"
        description="Leads, follow-ups and pipeline in one place. Status changes and assignments are written to the CRM store; HubSpot is synced best-effort."
        actions={
          <>
            <div className="flex overflow-hidden rounded-xl border border-admin-line">
              <button
                type="button"
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
                  view === 'table'
                    ? 'bg-himalayan text-white'
                    : 'bg-admin-surface text-admin-muted hover:bg-admin-canvas'
                }`}
              >
                <TableIcon size={15} /> Table
              </button>
              <button
                type="button"
                onClick={() => setView('board')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
                  view === 'board'
                    ? 'bg-himalayan text-white'
                    : 'bg-admin-surface text-admin-muted hover:bg-admin-canvas'
                }`}
              >
                <KanbanSquare size={15} /> Board
              </button>
            </div>
            {hubspotEnabled && (
              <AdminButton icon={DownloadCloud} onClick={handleImportHubspot} disabled={importing}>
                {importing ? 'Importing…' : 'Import from HubSpot'}
              </AdminButton>
            )}
            <AdminButton variant="primary" icon={Plus} onClick={() => setShowNewLead(true)}>
              New lead
            </AdminButton>
          </>
        }
      />

      {!isSupabaseConfigured() && (
        <AdminNotice tone="warning" title="The CRM store is not configured">
          This deployment has no CRM database, so the pipeline below stays empty. Nothing is invented
          in its place.
        </AdminNotice>
      )}

      {dueFollowUps.length > 0 && (
        <AdminPanel
          title={`${dueFollowUps.length} follow-up${dueFollowUps.length === 1 ? '' : 's'} due`}
          description="Due today or already overdue"
          action={<AdminChip tone="warning" icon={CalendarClock}>Needs attention</AdminChip>}
        >
          <ul className="space-y-2.5">
            {dueFollowUps.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={async () => {
                    if (!f.lead) return;
                    const lead = await crmApi.getLead(f.lead.id);
                    if (lead) setSelectedLead(lead);
                  }}
                  className="truncate text-left text-admin-ink hover:underline"
                >
                  <span className="font-semibold">{f.lead?.name || 'Lead'}</span>
                  {' — '}
                  {f.body}
                  <span className="text-admin-muted">
                    {' '}
                    ({f.due_at ? new Date(f.due_at).toLocaleDateString() : ''})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await crmApi.completeFollowUp(f.id);
                    toast.success('Follow-up completed');
                    fetchMeta();
                  }}
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <CheckCircle2 size={14} /> Done
                </button>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}

      {view === 'table' ? (
        <TableView
          leads={leads}
          loading={loading}
          fetchError={fetchError}
          onRetry={fetchLeads}
          search={search}
          setSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          statusFilter={statusFilter}
          setStatusFilter={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          counts={counts}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalCount={totalCount}
          staff={staff}
          onSelect={setSelectedLead}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <BoardView
          board={board}
          loading={boardLoading}
          counts={counts}
          staff={staff}
          onSelect={setSelectedLead}
        />
      )}

      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          staff={staff}
          onClose={() => setSelectedLead(null)}
          onStatusChange={(status) => handleStatusChange(selectedLead, status)}
          onAssign={(assignedTo) => handleAssign(selectedLead, assignedTo)}
          onActivityLogged={() => fetchMeta()}
        />
      )}

      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={() => {
            setShowNewLead(false);
            setPage(1);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}

/* ==================== Table view ==================== */

function TableView({
  leads,
  loading,
  fetchError,
  onRetry,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  counts,
  page,
  setPage,
  totalPages,
  totalCount,
  staff,
  onSelect,
  onStatusChange,
}: {
  leads: CrmLeadWithAssignee[];
  loading: boolean;
  fetchError: string | null;
  onRetry: () => void;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: CrmLeadStatus | 'all';
  setStatusFilter: (v: CrmLeadStatus | 'all') => void;
  counts: Record<CrmLeadStatus, number> | null;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  totalPages: number;
  totalCount: number;
  staff: CrmStaffMember[];
  onSelect: (lead: CrmLeadWithAssignee) => void;
  onStatusChange: (lead: CrmLeadWithAssignee, status: CrmLeadStatus) => void;
}) {
  const columns = [
    { key: 'lead', label: 'Lead', width: '34%' },
    { key: 'assignee', label: 'Assignee', width: '20%' },
    { key: 'source', label: 'Source', width: '26%' },
    { key: 'status', label: 'Status', width: '20%' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStatusFilter('all')} className={filterPill(statusFilter === 'all')}>
          All{counts ? ` (${Object.values(counts).reduce((a, b) => a + b, 0)})` : ''}
        </button>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={filterPill(statusFilter === status)}
          >
            {STATUS_META[status].label}
            {counts ? ` (${counts[status]})` : ''}
          </button>
        ))}
      </div>

      <AdminPanel bodyClassName="px-5 py-4">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or company…"
            aria-label="Search leads"
            className={`${INPUT} w-full pl-10`}
          />
        </div>
      </AdminPanel>

      {fetchError && (
        <AdminNotice
          tone="danger"
          title="Leads could not be loaded"
          action={<AdminButton onClick={onRetry}>Retry</AdminButton>}
        >
          {fetchError}
        </AdminNotice>
      )}

      <AdminPanel bodyClassName="px-0 py-0">
        <AdminTable columns={columns}>
          {loading ? (
            <AdminTableSkeleton rows={6} columns={4} />
          ) : leads.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-16 text-center">
                <Contact size={36} className="mx-auto text-admin-muted/60" />
                <p className="mt-3 text-sm font-semibold text-admin-ink">No leads found</p>
                <p className="mt-1 text-sm text-admin-muted">
                  {search || statusFilter !== 'all'
                    ? 'No leads match the current search and filter.'
                    : 'Leads from the contact form and manual entries appear here.'}
                </p>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className={`${ROW} cursor-pointer`} onClick={() => onSelect(lead)}>
                <td className={ADMIN_TD}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-himalayan-lighter">
                      <Contact size={16} className="text-himalayan" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-admin-ink">{lead.name}</p>
                      <p className="truncate text-xs text-admin-muted">{lead.email}</p>
                      {lead.company && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-admin-muted">
                          <Building2 size={12} /> {lead.company}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>
                  <span className="flex items-center gap-1.5">
                    <UserCircle2 size={15} className={lead.assigned_to ? 'text-himalayan' : 'text-admin-muted/50'} />
                    {staffName(staff, lead.assigned_to)}
                  </span>
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>
                  {SOURCE_LABELS[lead.source]}
                  <p className="mt-0.5 text-xs text-admin-muted">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </td>
                <td className={ADMIN_TD} onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead, e.target.value as CrmLeadStatus)}
                    aria-label={`Status for ${lead.name}`}
                    className={`${STATUS_CHIP_CONTROL} ${CHIP[STATUS_META[lead.status].tone]}`}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))
          )}
        </AdminTable>
      </AdminPanel>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-admin-muted">
          <span>
            Page {page} of {totalPages} · {totalCount} lead{totalCount === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <AdminButton disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </AdminButton>
            <AdminButton disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </AdminButton>
          </div>
        </div>
      )}
    </>
  );
}

/* ==================== Board view ==================== */

function BoardView({
  board,
  loading,
  counts,
  staff,
  onSelect,
}: {
  board: Record<CrmLeadStatus, CrmLeadWithAssignee[]> | null;
  loading: boolean;
  counts: Record<CrmLeadStatus, number> | null;
  staff: CrmStaffMember[];
  onSelect: (lead: CrmLeadWithAssignee) => void;
}) {
  /* Five fixed columns — the pipeline reads as a board at every viewport. */
  if (loading || !board) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className={`${SURFACE} h-64 animate-pulse`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {STATUS_ORDER.map((status) => (
        <div key={status} className={`${SURFACE} min-h-[16rem] p-3`}>
          <div className="flex items-center gap-2 px-1 pb-3">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[status].dot}`} />
            <span className="text-sm font-semibold text-admin-ink">{STATUS_META[status].label}</span>
            <span className="ml-auto text-xs font-semibold text-admin-muted">
              {counts ? counts[status] : board[status].length}
            </span>
          </div>
          <div className="space-y-2">
            {board[status].length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-admin-muted">No leads</p>
            ) : (
              board[status].map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelect(lead)}
                  className="w-full rounded-xl border border-admin-line bg-admin-surface p-3 text-left transition-shadow hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_18px_40px_-24px_rgba(16,24,40,0.3)]"
                >
                  <p className="truncate text-sm font-semibold text-admin-ink">{lead.name}</p>
                  <p className="truncate text-xs text-admin-muted">{lead.email}</p>
                  {lead.company && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-admin-muted">
                      <Building2 size={11} /> {lead.company}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-admin-muted">
                    <UserCircle2 size={12} className={lead.assigned_to ? 'text-himalayan' : 'text-admin-muted/50'} />
                    <span className="truncate">{staffName(staff, lead.assigned_to)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== Lead detail drawer ==================== */

function LeadDetailDrawer({
  lead,
  staff,
  onClose,
  onStatusChange,
  onAssign,
  onActivityLogged,
}: {
  lead: CrmLeadWithAssignee;
  staff: CrmStaffMember[];
  onClose: () => void;
  onStatusChange: (status: CrmLeadStatus) => void;
  onAssign: (assignedTo: string | null) => void;
  onActivityLogged: () => void;
}) {
  const toast = useToast();
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [activityType, setActivityType] = useState<CrmActivity['activity_type']>('note');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const [acts, ords] = await Promise.all([
        crmApi.getActivities(lead.id),
        crmApi.getLinkedOrders(lead.email),
      ]);
      setActivities(acts);
      setOrders(ords);
    } catch (err) {
      const message = getErrorMessage(err, 'Could not load lead details.');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [lead.id, lead.email, toast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleAddActivity = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await crmApi.addActivity(lead.id, {
        activity_type: activityType,
        body: body.trim(),
        due_at: activityType === 'follow_up' && dueAt ? new Date(dueAt).toISOString() : null,
      });
      setBody('');
      setActivityType('note');
      setDueAt('');
      await loadDetail();
      onActivityLogged();
      toast.success('Activity logged');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not log activity.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      variant="drawer"
      title={lead.name}
      description={`${SOURCE_LABELS[lead.source]} · added ${new Date(lead.created_at).toLocaleDateString()}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Contact */}
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 text-admin-muted">
            <Mail size={15} />
            <a href={`mailto:${lead.email}`} className="text-himalayan hover:underline">
              {lead.email}
            </a>
          </p>
          {lead.phone && (
            <p className="flex items-center gap-2 text-admin-muted">
              <Phone size={15} />
              <a href={`tel:${lead.phone}`} className="text-himalayan hover:underline">
                {lead.phone}
              </a>
            </p>
          )}
          {lead.company && (
            <p className="flex items-center gap-2 text-admin-muted">
              <Building2 size={15} /> {lead.company}
            </p>
          )}
        </div>

        {/* Status + assignee */}
        <div className="grid grid-cols-2 gap-3">
          <AdminField label="Status">
            <select
              value={lead.status}
              onChange={(e) => onStatusChange(e.target.value as CrmLeadStatus)}
              className={STATUS_SELECT}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Assignee">
            <select
              value={lead.assigned_to || ''}
              onChange={(e) => onAssign(e.target.value || null)}
              className={STATUS_SELECT}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
          </AdminField>
        </div>

        {lead.subject && (
          <div>
            <p className={MICRO_LABEL}>Subject</p>
            <p className="mt-1 text-sm text-admin-ink">{lead.subject}</p>
          </div>
        )}

        {lead.notes && (
          <div>
            <p className={MICRO_LABEL}>Original message</p>
            <p className="mt-1 whitespace-pre-wrap rounded-xl border border-admin-line bg-admin-canvas p-3 text-sm text-admin-ink">
              {lead.notes}
            </p>
          </div>
        )}

        {/* Linked orders */}
        <div className="border-t border-admin-line pt-4">
          <p className={MICRO_LABEL}>Order history</p>
          {loading ? (
            <p className="mt-2 text-sm text-admin-muted">Reading orders…</p>
          ) : loadError ? (
            <p className="mt-2 text-sm text-admin-muted">{loadError}</p>
          ) : orders.length === 0 ? (
            <p className="mt-2 text-sm text-admin-muted">No orders found for this email.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border border-admin-line bg-admin-canvas px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-admin-ink">#{o.order_number}</span>
                    <span className="ml-2 text-xs capitalize text-admin-muted">{o.status}</span>
                  </div>
                  <span className="font-semibold text-admin-ink">
                    {o.currency?.toUpperCase() || 'USD'} {Number(o.total).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Log activity */}
        <form onSubmit={handleAddActivity} className="space-y-3 border-t border-admin-line pt-4">
          <p className={MICRO_LABEL}>Log activity</p>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as CrmActivity['activity_type'])}
            aria-label="Activity type"
            className={STATUS_SELECT}
          >
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="follow_up">Follow-up</option>
          </select>
          {activityType === 'follow_up' && (
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              aria-label="Follow-up due date"
              className={STATUS_SELECT}
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="What happened?"
            className={`${INPUT} w-full`}
          />
          <button type="submit" disabled={saving || !body.trim()} className={`${BUTTON.primary} w-full`}>
            <MessageSquarePlus size={15} />
            {saving ? 'Saving…' : 'Add activity'}
          </button>
        </form>

        {/* Timeline */}
        <div className="border-t border-admin-line pt-4">
          <p className={MICRO_LABEL}>Activity timeline</p>
          {loading ? (
            <p className="mt-2 text-sm text-admin-muted">Reading activity…</p>
          ) : activities.length === 0 ? (
            <p className="mt-2 text-sm text-admin-muted">No activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminChip tone="muted">{a.activity_type.replace('_', ' ')}</AdminChip>
                    {a.activity_type === 'follow_up' && a.due_at && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          a.completed ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        <CalendarClock size={12} /> {new Date(a.due_at).toLocaleDateString()}
                        {a.completed ? ' (done)' : ''}
                      </span>
                    )}
                    <span className="text-xs text-admin-muted">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-admin-ink">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

/* ==================== New lead modal ==================== */

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', subject: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => form.name.trim() && form.email.trim(), [form]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await crmApi.createLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        subject: form.subject.trim() || null,
        notes: form.notes.trim() || null,
        source: 'manual',
      });
      toast.success('Lead created');
      // Best-effort push to HubSpot (no-op / soft warning if not configured).
      const sync = await syncLeadToHubspot({
        email: form.email.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        status: 'new',
        notes: form.notes.trim() || null,
      });
      if (!sync.ok && sync.error && !/not configured/i.test(sync.error)) {
        toast.error(`Lead saved, but HubSpot sync failed: ${sync.error}`);
      }
      onCreated();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create lead.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title="New lead"
      description="Added to the CRM pipeline and pushed to HubSpot when that integration is configured."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BUTTON.secondary}>
            Cancel
          </button>
          <button type="submit" form="crm-new-lead" disabled={saving || !canSubmit} className={BUTTON.primary}>
            {saving ? 'Saving…' : 'Create lead'}
          </button>
        </>
      }
    >
      <form id="crm-new-lead" onSubmit={handleSubmit} className="space-y-4">
        {(
          [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'phone', label: 'Phone', type: 'tel', required: false },
            { key: 'company', label: 'Company', type: 'text', required: false },
            { key: 'subject', label: 'Subject', type: 'text', required: false },
          ] as const
        ).map((field) => (
          <AdminField key={field.key} label={field.required ? `${field.label} *` : field.label}>
            <AdminInput
              type={field.type}
              value={form[field.key]}
              onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
            />
          </AdminField>
        ))}
        <AdminField label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            className={`${INPUT} w-full`}
          />
        </AdminField>
      </form>
    </AdminModal>
  );
}
