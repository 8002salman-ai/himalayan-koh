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
  X,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
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

const STATUS_META: Record<CrmLeadStatus, { label: string; color: string; dot: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  contacted: { label: 'Contacted', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  lost: { label: 'Lost', color: 'bg-gray-200 text-gray-600', dot: 'bg-gray-400' },
};

const STATUS_ORDER: CrmLeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

const SOURCE_LABELS: Record<string, string> = {
  contact_form: 'Contact Form',
  dealer_application: 'Wholesale Application',
  manual: 'Manual',
  other: 'Other',
};

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
      // Non-critical decorative data.
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
    return followUps.filter((f) => f.due_at && new Date(f.due_at).getTime() <= now + 24 * 60 * 60 * 1000);
  }, [followUps]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">CRM</h1>
          <p className="text-charcoal-light">Track leads, follow-ups, and your pipeline in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'table' ? 'bg-himalayan text-white' : 'bg-white text-charcoal-light hover:bg-gray-50'}`}
            >
              <TableIcon size={15} /> Table
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${view === 'board' ? 'bg-himalayan text-white' : 'bg-white text-charcoal-light hover:bg-gray-50'}`}
            >
              <KanbanSquare size={15} /> Board
            </button>
          </div>
          <Button onClick={() => setShowNewLead(true)} className="gap-1.5">
            <Plus size={16} /> New Lead
          </Button>
          {hubspotEnabled && (
            <Button
              variant="secondary"
              onClick={handleImportHubspot}
              disabled={importing}
              className="gap-1.5"
            >
              <DownloadCloud size={16} /> {importing ? 'Importing…' : 'Import from HubSpot'}
            </Button>
          )}
        </div>
      </div>

      {/* Follow-up widget */}
      {dueFollowUps.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-800 text-sm">
            <CalendarClock size={16} /> {dueFollowUps.length} follow-up{dueFollowUps.length > 1 ? 's' : ''} due
          </p>
          <ul className="mt-2 space-y-1.5">
            {dueFollowUps.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={async () => {
                    if (!f.lead) return;
                    const lead = await crmApi.getLead(f.lead.id);
                    if (lead) setSelectedLead(lead);
                  }}
                  className="text-left text-amber-900 hover:underline truncate"
                >
                  <span className="font-medium">{f.lead?.name || 'Lead'}</span>
                  {' — '}{f.body}
                  <span className="text-amber-700"> ({f.due_at ? new Date(f.due_at).toLocaleDateString() : ''})</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await crmApi.completeFollowUp(f.id);
                    toast.success('Follow-up completed');
                    fetchMeta();
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 flex-shrink-0"
                >
                  <CheckCircle2 size={14} /> Done
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'table' ? (
        <TableView
          leads={leads}
          loading={loading}
          fetchError={fetchError}
          onRetry={fetchLeads}
          search={search}
          setSearch={(v) => { setSearch(v); setPage(1); }}
          statusFilter={statusFilter}
          setStatusFilter={(v) => { setStatusFilter(v); setPage(1); }}
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

// ==================== Table View ====================

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
  return (
    <>
      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
            statusFilter === 'all'
              ? 'bg-himalayan text-white border-himalayan'
              : 'bg-white text-charcoal-light border-gray-200 hover:border-himalayan'
          }`}
        >
          All{counts ? ` (${Object.values(counts).reduce((a, b) => a + b, 0)})` : ''}
        </button>
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              statusFilter === status
                ? 'bg-himalayan text-white border-himalayan'
                : 'bg-white text-charcoal-light border-gray-200 hover:border-himalayan'
            }`}
          >
            {STATUS_META[status].label}{counts ? ` (${counts[status]})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-himalayan/30 focus:border-himalayan"
          />
        </div>
      </div>

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Leads could not be loaded.</p>
          <p className="mt-1">{fetchError}</p>
          <Button variant="destructive" size="sm" onClick={onRetry} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden md:table-cell">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <SkeletonTable rows={6} />
            </table>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={<Contact size={40} />}
            title="No leads found"
            description={search || statusFilter !== 'all' ? 'No leads match your filters' : 'Leads from the contact form and manual entries will appear here'}
            size="compact"
            className="border-0 shadow-none rounded-none py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden md:table-cell">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide hidden sm:table-cell">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-charcoal-light uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelect(lead)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-himalayan/10 flex items-center justify-center flex-shrink-0">
                          <Contact size={18} className="text-himalayan" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal">{lead.name}</p>
                          <p className="text-xs text-charcoal-light truncate">{lead.email}</p>
                          {lead.company && (
                            <p className="text-xs text-charcoal-light mt-0.5 flex items-center gap-1">
                              <Building2 size={12} /> {lead.company}
                            </p>
                          )}
                          <p className="text-xs text-charcoal-light mt-0.5 sm:hidden">{SOURCE_LABELS[lead.source]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden md:table-cell">
                      <span className="flex items-center gap-1.5">
                        <UserCircle2 size={15} className={lead.assigned_to ? 'text-himalayan' : 'text-gray-300'} />
                        {staffName(staff, lead.assigned_to)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal-light hidden sm:table-cell">
                      {SOURCE_LABELS[lead.source]}
                      <p className="text-xs text-charcoal-light mt-0.5">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => onStatusChange(lead, e.target.value as CrmLeadStatus)}
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 focus:ring-2 focus:ring-himalayan/30 cursor-pointer ${STATUS_META[lead.status].color}`}
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-charcoal-light">
          <span>Showing page {page} of {totalPages} ({totalCount} leads)</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Previous</button>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Board View ====================

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
  if (loading || !board) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-gray-50 rounded-2xl h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="bg-gray-50 rounded-2xl p-2 min-h-[16rem]">
          <div className="flex items-center gap-2 px-2 py-2">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[status].dot}`} />
            <span className="text-sm font-semibold text-charcoal">{STATUS_META[status].label}</span>
            <span className="text-xs text-charcoal-light ml-auto">{counts ? counts[status] : board[status].length}</span>
          </div>
          <div className="space-y-2">
            {board[status].length === 0 ? (
              <p className="text-xs text-charcoal-light px-2 py-4 text-center">No leads</p>
            ) : (
              board[status].map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelect(lead)}
                  className="w-full text-left bg-white rounded-xl p-3 shadow-sm hover:shadow transition"
                >
                  <p className="font-medium text-charcoal text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-charcoal-light truncate">{lead.email}</p>
                  {lead.company && (
                    <p className="text-xs text-charcoal-light mt-1 flex items-center gap-1 truncate">
                      <Building2 size={11} /> {lead.company}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-charcoal-light">
                    <UserCircle2 size={12} className={lead.assigned_to ? 'text-himalayan' : 'text-gray-300'} />
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

// ==================== Lead Detail Drawer ====================

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
  const [body, setBody] = useState('');
  const [activityType, setActivityType] = useState<CrmActivity['activity_type']>('note');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [acts, ords] = await Promise.all([
        crmApi.getActivities(lead.id),
        crmApi.getLinkedOrders(lead.email),
      ]);
      setActivities(acts);
      setOrders(ords);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load lead details.'));
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-charcoal">{lead.name}</h2>
            <p className="text-sm text-charcoal-light">{SOURCE_LABELS[lead.source]}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-charcoal">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Contact info */}
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-charcoal-light">
              <Mail size={15} /> <a href={`mailto:${lead.email}`} className="text-himalayan hover:underline">{lead.email}</a>
            </p>
            {lead.phone && (
              <p className="flex items-center gap-2 text-charcoal-light">
                <Phone size={15} /> <a href={`tel:${lead.phone}`} className="text-himalayan hover:underline">{lead.phone}</a>
              </p>
            )}
            {lead.company && (
              <p className="flex items-center gap-2 text-charcoal-light">
                <Building2 size={15} /> {lead.company}
              </p>
            )}
          </div>

          {/* Status + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1.5">Status</label>
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(e.target.value as CrmLeadStatus)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1.5">Assignee</label>
              <select
                value={lead.assigned_to || ''}
                onChange={(e) => onAssign(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                ))}
              </select>
            </div>
          </div>

          {lead.subject && (
            <div>
              <p className="text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1">Subject</p>
              <p className="text-sm text-charcoal">{lead.subject}</p>
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1">Original Message</p>
              <p className="text-sm text-charcoal whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{lead.notes}</p>
            </div>
          )}

          {/* Linked orders */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-2">Order History</p>
            {loading ? (
              <p className="text-sm text-charcoal-light">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-charcoal-light">No orders found for this email.</p>
            ) : (
              <ul className="space-y-2">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                    <div>
                      <span className="font-medium text-charcoal">#{o.order_number}</span>
                      <span className="text-xs text-charcoal-light ml-2 capitalize">{o.status}</span>
                    </div>
                    <span className="font-medium text-charcoal">
                      {o.currency?.toUpperCase() || 'USD'} {Number(o.total).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add activity */}
          <form onSubmit={handleAddActivity} className="space-y-2 border-t border-gray-100 pt-4">
            <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide">Log Activity</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as CrmActivity['activity_type'])}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
              />
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="What happened?"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
            />
            <Button type="submit" size="sm" disabled={saving || !body.trim()} className="gap-1.5 w-full">
              <MessageSquarePlus size={15} /> {saving ? 'Saving...' : 'Add Activity'}
            </Button>
          </form>

          {/* Activity timeline */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-3">Activity Timeline</p>
            {loading ? (
              <p className="text-sm text-charcoal-light">Loading...</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-charcoal-light">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-charcoal-light text-xs capitalize">
                        {a.activity_type.replace('_', ' ')}
                      </span>
                      {a.activity_type === 'follow_up' && a.due_at && (
                        <span className={`inline-flex items-center gap-1 text-xs ${a.completed ? 'text-green-600' : 'text-amber-600'}`}>
                          <CalendarClock size={12} /> {new Date(a.due_at).toLocaleDateString()}
                          {a.completed ? ' (done)' : ''}
                        </span>
                      )}
                      <span className="text-xs text-charcoal-light">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-charcoal mt-1 whitespace-pre-wrap">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== New Lead Modal ====================

function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-charcoal">New Lead</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-charcoal">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {([
            { key: 'name', label: 'Name *', type: 'text' },
            { key: 'email', label: 'Email *', type: 'email' },
            { key: 'phone', label: 'Phone', type: 'tel' },
            { key: 'company', label: 'Company', type: 'text' },
            { key: 'subject', label: 'Subject', type: 'text' },
          ] as const).map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1">{field.label}</label>
              <input
                type={field.type}
                value={form[field.key]}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-charcoal-light uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-himalayan/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving || !canSubmit} className="flex-1">
              {saving ? 'Saving...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
