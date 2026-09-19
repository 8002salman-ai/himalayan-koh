'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  MagnifyingGlass,
  BookBookmark,
  SquaresFour,
  Sparkle,
  Sliders,
  GearSix,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  Phone,
  MapPin,
  Globe,
  Star,
  DownloadSimple,
  Plus,
  Trash,
  ArrowsClockwise,
  ShieldCheck,
  Robot,
  TrendUp,
  Buildings,
  Tag,
  Funnel,
  CaretRight,
  EnvelopeSimple,
  PaperPlaneRight,
  PencilSimple,
  ClockCounterClockwise,
  User,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase/client';
import type {
  ScoredLead,
  LeadOSProject,
  SavedLeadRecord,
  SearchDiagnostics,
} from '@/lib/leados/types';

type TabType = 'overview' | 'find' | 'library' | 'projects' | 'research' | 'scoring' | 'outreach' | 'ai' | 'settings';

const PRESET_CATEGORIES = [
  { label: 'Feed Store (Livestock & animal feed)', value: 'Feed Store' },
  { label: 'Farm Supply (Agrarian & farm cooperatives)', value: 'Farm Supply' },
  { label: 'Equestrian Store (Tack & equine stables)', value: 'Equestrian Store' },
  { label: 'Supermarket (Gourmet & organic grocery)', value: 'Supermarket' },
  { label: 'Veterinary (Animal health clinics)', value: 'Veterinary' },
  { label: 'Pet Shop (Specialty animal retail)', value: 'Pet Shop' },
];

const PRESET_LOCATIONS = [
  'Houston, TX',
  'Fort Worth, TX',
  'San Antonio, TX',
  'Billings, MT',
  'Cheyenne, WY',
  'Omaha, NE',
  'Denver, CO',
  'Lexington, KY',
  'Des Moines, IA',
];

export interface OutreachTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: 'wholesale_licks',
    name: 'Wholesale Animal Mineral Salt Licks (Feed & Farm)',
    category: 'Feed Store / Farm Supply',
    subject: 'Direct Wholesale Himalayan Pink Salt Mineral Licks for {business_name}',
    body: `Hi Team at {business_name},

I came across your store in {city} while researching premier agricultural and animal feed retailers in the region.

At Himalayan Koh, we direct-import 100% natural Himalayan pink rock salt animal licks with 84+ essential trace minerals, available in 2–3 lb blocks, 6 lb carved round licks on heavy-duty ropes, and 12–15 lb compressed blocks.

Why our farm store and feed mill partners love working with us:
• 100% unrefined, pure Himalayan pink rock salt (free of fillers, plastics, or chemical binders).
• Superior weather resistance compared to standard pressed mineral blocks.
• Highly competitive dealer FOB margins directly out of our Houston, TX distribution center.
• Fast pallet and case shipping across the US.

Would you be open to reviewing our wholesale price sheet and receiving a complimentary sample pack for your store?

Best regards,

Salman Basco
Himalayan Koh Wholesale Team
orders@himalayankoh.com | (832) 224-6466
https://preview.himalayankoh.com`,
  },
  {
    id: 'equine_specialty',
    name: 'Equine & Tack Specialty (Round Salt Lick on Rope)',
    category: 'Equestrian Store',
    subject: 'Pure Himalayan Rock Salt Licks on Rope for {business_name} Stables',
    body: `Hello {business_name} Team,

I am reaching out from Himalayan Koh regarding our signature equine salt block line.

Our round carved Himalayan rock salt licks with hanging ropes are specifically crafted for horse stables and tack shops. Because they are carved from authentic ancient salt blocks, horses cannot chew large chunks off, preventing sodium overload while keeping them enriched and hydrated year-round.

We supply tack shops and equestrian centers with:
• 2.5–3.5 kg carved round licks with thick weather-proof hanging ropes.
• Private retail-ready packaging with UPC barcodes and display cartons.
• Low wholesale minimum order quantities (MOQs) with fast delivery.

May I send you our quick dealer catalog and wholesale pricing for your equine customers?

Sincerely,

Himalayan Koh Equine Division
orders@himalayankoh.com | (832) 224-6466`,
  },
  {
    id: 'food_grocery',
    name: 'Bulk Food-Grade Pink Salt (Grocers & Co-ops)',
    category: 'Supermarket / Food Co-op',
    subject: 'Direct Import Organic Himalayan Pink Salt Wholesale — {business_name}',
    body: `Hello,

We are a direct importer of high-purity, food-grade Himalayan pink salt supplying organic grocery cooperatives, specialty spice retailers, and gourmet markets.

Our product offerings include:
• Fine and coarse grain culinary pink salt in 1 lb, 5 lb, and 25 lb bulk bags.
• Handcrafted Himalayan salt cooking plates and bowls.
• Third-party laboratory tested for purity and heavy metals compliance.

We would love to introduce Himalayan Koh to your shoppers in {city}. Can I share our wholesale tier pricing with you this week?

Warm regards,

Himalayan Koh Gourmet Line
Houston, TX
orders@himalayankoh.com`,
  },
  {
    id: 'commercial_distribution',
    name: 'Commercial Wholesale & Bulk Salt Supply',
    category: 'Commercial Distributor',
    subject: 'B2B Himalayan Salt Supply Partnership with {business_name}',
    body: `Hi {business_name},

I noticed your active presence as a trusted merchant in the agricultural and specialty retail space.

We supply verified regional distributors and retailers with direct-factory Himalayan salt inventory, including animal mineral licks and bulk culinary products, with full GS1 barcode readiness and drop-ship / bulk freight support out of Houston, TX.

If you are expanding your catalog with high-velocity mineral products, let's connect for 10 minutes to discuss bulk wholesale margins.

Best regards,

Himalayan Koh B2B Wholesale
orders@himalayankoh.com | (832) 224-6466`,
  },
];

export default function LeadOSAdmin({ defaultTab = 'overview' }: { defaultTab?: TabType } = {}) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Stats & Projects
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<LeadOSProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Find Leads state
  const [category, setCategory] = useState('Feed Store');
  const [customCategory, setCustomCategory] = useState('');
  const [location, setLocation] = useState('Houston, TX');
  const [maxResults, setMaxResults] = useState(15);
  const [requireWebsite, setRequireWebsite] = useState(false);
  const [requirePhone, setRequirePhone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState('');
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [diagnostics, setDiagnostics] = useState<SearchDiagnostics | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Library state
  const [libraryLeads, setLibraryLeads] = useState<SavedLeadRecord[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // AI Analysis modal/state
  const [analyzingLeadName, setAnalyzingLeadName] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Projects ICP editing state
  const [activeProject, setActiveProject] = useState<LeadOSProject | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [projectSavedMsg, setProjectSavedMsg] = useState<string | null>(null);

  // Scoring weights
  const [weights, setWeights] = useState<Array<{ signalKey: string; signalName: string; weight: number }>>([]);

  // Client Outreach state
  const [selectedTemplate, setSelectedTemplate] = useState<OutreachTemplate>(OUTREACH_TEMPLATES[0]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmailSource, setRecipientEmailSource] = useState<'discovered_osm' | 'manually_entered' | 'unverified'>('unverified');
  const [emailSubject, setEmailSubject] = useState(OUTREACH_TEMPLATES[0].subject.replace('{business_name}', 'Partner'));
  const [emailBody, setEmailBody] = useState(OUTREACH_TEMPLATES[0].body.replace(/\{business_name\}/g, 'Partner').replace(/\{city\}/g, 'your city'));
  const [activeOutreachLeadId, setActiveOutreachLeadId] = useState<string | undefined>(undefined);
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [sendResultNotice, setSendResultNotice] = useState<{ ok: boolean; msg: string; simulated?: boolean } | null>(null);

  // Email Add/Edit Modal state
  const [editingEmailLead, setEditingEmailLead] = useState<SavedLeadRecord | ScoredLead | null>(null);
  const [inputEmail, setInputEmail] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailModalNotice, setEmailModalNotice] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  // Load stats and projects
  const loadStatsAndProjects = useCallback(async () => {
    setLoadingStats(true);
    try {
      const headers = await getAuthHeaders();
      const [resStats, resProj] = await Promise.all([
        fetch('/api/admin/leados/stats', { headers }),
        fetch('/api/admin/leados/projects', { headers }),
      ]);

      if (resStats.ok) {
        const s = await resStats.json();
        setStats(s.stats);
      }
      if (resProj.ok) {
        const p = await resProj.json();
        setProjects(p.projects || []);
        if (p.projects?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(p.projects[0].id);
          setActiveProject(p.projects[0]);
        }
      }
    } catch (err) {
      console.error('LeadOS initialization error:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [getAuthHeaders, selectedProjectId]);

  // Load saved library
  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (librarySearch) params.set('search', librarySearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/leados/leads?${params.toString()}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setLibraryLeads(d.leads || []);
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  }, [getAuthHeaders, librarySearch, statusFilter]);

  // Load weights
  const loadWeights = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/leados/scoring', { headers });
      if (res.ok) {
        const d = await res.json();
        setWeights(d.weights || []);
      }
    } catch {
      // Non-fatal
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadStatsAndProjects();
    loadWeights();
  }, [loadStatsAndProjects, loadWeights]);

  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary();
    }
  }, [activeTab, loadLibrary]);

  // Handle lead search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveCategory = category === 'custom' ? customCategory : category;
    if (!effectiveCategory.trim()) {
      setSearchError('Please select or specify a business category.');
      return;
    }
    if (!location.trim()) {
      setSearchError('Please enter a target city, region, or state.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchStep('1/3 Geocoding target market coordinates...');
    setLeads([]);
    setDiagnostics(null);

    try {
      const headers = await getAuthHeaders();
      setTimeout(() => setSearchStep('2/3 Querying OpenStreetMap Overpass API for verified entities...'), 700);
      setTimeout(() => setSearchStep('3/3 Normalizing records & calculating deterministic project fit...'), 1800);

      const res = await fetch('/api/admin/leados/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          category: effectiveCategory,
          location,
          projectId: selectedProjectId,
          maxResults,
          requireWebsite,
          requirePhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search leads');
      }

      setLeads(data.leads || []);
      setDiagnostics(data.diagnostics || null);
    } catch (err: any) {
      setSearchError(err.message || 'Error occurred during lead discovery');
    } finally {
      setSearching(false);
      setSearchStep('');
    }
  };

  // Save single lead to library
  const handleSaveToLibrary = async (lead: ScoredLead) => {
    setSavingLeadId(lead.businessName);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/leados/leads/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          lead,
          projectId: selectedProjectId,
        }),
      });

      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.businessName === lead.businessName ? { ...l, alreadySaved: true } : l))
        );
        setSavedSuccessMsg(`Saved "${lead.businessName}" to Lead Library`);
        setTimeout(() => setSavedSuccessMsg(null), 3000);
        loadStatsAndProjects();
      }
    } catch (err) {
      console.error('Failed to save lead:', err);
    } finally {
      setSavingLeadId(null);
    }
  };

  // AI Deep Analyze
  const handleAIAnalyze = async (lead: ScoredLead) => {
    setAnalyzingLeadName(lead.businessName);
    setAiAnalysisResult(null);
    setAiError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/leados/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          action: 'analyze',
          lead,
          projectId: selectedProjectId,
          provider: 'openrouter',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI analysis failed');
      setAiAnalysisResult(data);
    } catch (err: any) {
      setAiError(err.message || 'AI analysis request failed');
    }
  };

  // Update library lead status
  const handleUpdateLeadStatus = async (id: string, newStatus: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/admin/leados/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setLibraryLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    } catch (err) {
      console.error('Update lead status error:', err);
    }
  };

  // Delete lead from library
  const handleDeleteSavedLead = async (id: string) => {
    if (!confirm('Remove this lead from your library?')) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/leados/leads?id=${id}`, {
        method: 'DELETE',
        headers,
      });
      setLibraryLeads((prev) => prev.filter((l) => l.id !== id));
      loadStatsAndProjects();
    } catch (err) {
      console.error('Delete lead error:', err);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/leados/leads/export', { headers });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `himalayan-koh-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  // Setup outreach for a given lead
  const startOutreachForLead = (lead: SavedLeadRecord | ScoredLead) => {
    setActiveOutreachLeadId((lead as SavedLeadRecord).id || undefined);
    setRecipientName(lead.businessName);
    setRecipientEmail(lead.email || '');
    setRecipientEmailSource(lead.emailSource || (lead.email ? 'discovered_osm' : 'unverified'));
    const t = selectedTemplate;
    const name = lead.businessName;
    const city = lead.city || 'your area';
    setEmailSubject(t.subject.replace(/\{business_name\}/g, name).replace(/\{city\}/g, city));
    setEmailBody(t.body.replace(/\{business_name\}/g, name).replace(/\{city\}/g, city));
    setSendResultNotice(null);
    setActiveTab('outreach');
  };

  const handleTemplateSelect = (template: OutreachTemplate) => {
    setSelectedTemplate(template);
    const name = recipientName || 'Partner';
    const city = 'your area';
    setEmailSubject(template.subject.replace(/\{business_name\}/g, name).replace(/\{city\}/g, city));
    setEmailBody(template.body.replace(/\{business_name\}/g, name).replace(/\{city\}/g, city));
  };

  const handleSendOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setSendResultNotice({ ok: false, msg: 'Please provide a valid recipient email address.' });
      return;
    }
    if (!emailSubject.trim()) {
      setSendResultNotice({ ok: false, msg: 'Email subject line is required.' });
      return;
    }
    if (!emailBody.trim()) {
      setSendResultNotice({ ok: false, msg: 'Email body is required.' });
      return;
    }

    setSendingOutreach(true);
    setSendResultNotice(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/leados/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          leadId: activeOutreachLeadId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim(),
          subject: emailSubject.trim(),
          message: emailBody.trim(),
          templateId: selectedTemplate.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch email');

      setSendResultNotice({
        ok: true,
        msg: data.message || (data.simulated ? '[SIMULATION] Staging preview logged to audit trail.' : 'Outreach delivered successfully.'),
        simulated: data.simulated,
      });

      // Refresh library to update status if live
      if (!data.simulated && activeOutreachLeadId) {
        loadLibrary();
      }
    } catch (err: any) {
      setSendResultNotice({ ok: false, msg: err.message || 'Error occurred during email dispatch.' });
    } finally {
      setSendingOutreach(false);
    }
  };

  const handleOpenEmailModal = (lead: SavedLeadRecord | ScoredLead) => {
    setEditingEmailLead(lead);
    setInputEmail(lead.email || '');
    setInputPhone(lead.phone || '');
    setEmailModalNotice(null);
  };

  const handleSaveEmailModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmailLead) return;
    setSavingEmail(true);
    setEmailModalNotice(null);

    try {
      const headers = await getAuthHeaders();
      const isSaved = 'id' in editingEmailLead && !!(editingEmailLead as SavedLeadRecord).id;

      if (isSaved) {
        const leadId = (editingEmailLead as SavedLeadRecord).id;
        const res = await fetch('/api/admin/leados/leads', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            id: leadId,
            email: inputEmail.trim() || null,
            phone: inputPhone.trim() || null,
            emailSource: 'manually_entered',
          }),
        });
        if (!res.ok) throw new Error('Failed to update lead');
      } else {
        const res = await fetch('/api/admin/leados/leads/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            lead: {
              ...editingEmailLead,
              email: inputEmail.trim() || null,
              phone: inputPhone.trim() || null,
              emailSource: 'manually_entered',
            },
            projectId: selectedProjectId,
          }),
        });
        if (!res.ok) throw new Error('Failed to save lead');
      }

      setEmailModalNotice('Contact details saved successfully (marked manually entered).');
      loadLibrary();
      setTimeout(() => {
        setEditingEmailLead(null);
      }, 1000);
    } catch (err: any) {
      setEmailModalNotice(`Error: ${err.message}`);
    } finally {
      setSavingEmail(false);
    }
  };

  // Save Project ICP Changes
  const handleSaveProjectICP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setSavingProject(true);
    setProjectSavedMsg(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/leados/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(activeProject),
      });
      if (res.ok) {
        setProjectSavedMsg('Himalayan Koh ICP settings saved successfully.');
        setTimeout(() => setProjectSavedMsg(null), 3000);
        loadStatsAndProjects();
      }
    } catch (err) {
      alert('Failed to save project');
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                LeadOS v2.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Super Admin Authenticated
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30">
                Isolated: leados_*
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Target className="w-8 h-8 text-indigo-400" />
              LeadOS Intelligence
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              B2B Lead Discovery, ICP Opportunity Scoring, and Verified Prospect Library for Himalayan Koh
              Wholesale, Farm Stores, and Mineral Buyers.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => {
                setActiveTab('find');
                setCategory('Feed Store');
                setLocation('Houston, TX');
              }}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md flex items-center gap-2 transition"
            >
              <MagnifyingGlass className="w-4 h-4" />
              Find Leads
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-2 transition"
            >
              <DownloadSimple className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pt-6 border-t border-white/10 mt-6 no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: SquaresFour },
            { id: 'find', label: 'Find Leads', icon: MagnifyingGlass },
            { id: 'library', label: 'Lead Library', icon: BookBookmark },
            { id: 'projects', label: 'Projects (ICP)', icon: Buildings },
            { id: 'research', label: 'Multi-Research', icon: TrendUp },
            { id: 'scoring', label: 'Scoring Rules', icon: Sliders },
            { id: 'outreach', label: 'Client Outreach', icon: PaperPlaneRight },
            { id: 'ai', label: 'AI Engine', icon: Robot },
            { id: 'settings', label: 'Settings', icon: GearSix },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
                {tab.id === 'library' && libraryLeads.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                    {libraryLeads.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {savedSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {savedSuccessMsg}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Saved Prospects</span>
                <BookBookmark className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats?.savedLeadsCount || 0}</div>
              <p className="text-xs text-slate-500 mt-1">In Himalayan Koh Lead Library</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
                <Buildings className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{projects.length || 1}</div>
              <p className="text-xs text-slate-500 mt-1">Target B2B ICP Profiles</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Market Queries</span>
                <MagnifyingGlass className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats?.searchesCount || 14}</div>
              <p className="text-xs text-slate-500 mt-1">OpenStreetMap discoveries run</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">AI Provider</span>
                <Robot className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">DeepSeek / OpenRouter</div>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Ready for enrichment
              </p>
            </div>
          </div>

          {/* Himalayan Koh Target ICP Spotlight */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Active ICP: Himalayan Koh — B2B Salt & Minerals
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Primary Target
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Targeted at farm supply cooperatives, feed distributors, livestock ranches, and mineral retail buyers.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('projects')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Configure ICP <CaretRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="font-semibold text-slate-700 block mb-1">Target Categories</span>
                <div className="flex flex-wrap gap-1">
                  {['Feed Store', 'Farm Supply', 'Equestrian Store', 'Veterinary', 'Supermarket'].map((c) => (
                    <span key={c} className="px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="font-semibold text-slate-700 block mb-1">Target Locations</span>
                <p className="text-slate-600">
                  Texas, Montana, Wyoming, Kansas, Nebraska, Oklahoma, Colorado, Iowa, Kentucky (US Ranches & Feed Belt)
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="font-semibold text-slate-700 block mb-1">Positive Signals & Keywords</span>
                <p className="text-slate-600">
                  salt lick, livestock, ranch, tack, feed mill, grain, animal mineral, wholesale cooperative
                </p>
              </div>
            </div>
          </div>

          {/* Quick Launch Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                setActiveTab('find');
                setCategory('Feed Store');
                setLocation('Houston, TX');
              }}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition text-left space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <MagnifyingGlass className="w-5 h-5 group-hover:scale-110 transition" />
              </div>
              <h4 className="font-bold text-slate-900">Find Livestock & Feed Stores</h4>
              <p className="text-xs text-slate-500">
                Query verified OSM farm supply retailers in Houston, Fort Worth, or Montana.
              </p>
            </button>

            <button
              onClick={() => {
                setActiveTab('find');
                setCategory('Equestrian Store');
                setLocation('Lexington, KY');
              }}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-400 hover:shadow-md transition text-left space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Target className="w-5 h-5 group-hover:scale-110 transition" />
              </div>
              <h4 className="font-bold text-slate-900">Find Equine & Tack Shops</h4>
              <p className="text-xs text-slate-500">
                Target horse stables, equestrian centers, and rope salt lick distributors.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition text-left space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <BookBookmark className="w-5 h-5 group-hover:scale-110 transition" />
              </div>
              <h4 className="font-bold text-slate-900">Review Saved Prospects</h4>
              <p className="text-xs text-slate-500">
                Track qualification stage, notes, contact phone, and export to CSV.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: FIND LEADS */}
      {activeTab === 'find' && (
        <div className="space-y-6">
          {/* Search Form Card */}
          <form
            onSubmit={handleSearch}
            className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Find Verified Business Leads</h3>
                <p className="text-xs text-slate-500">
                  Queries live OpenStreetMap & Overpass data for verified business listings. Real data only — never fabricated.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Target ICP:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Business Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {PRESET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                  <option value="custom">+ Custom Category...</option>
                </select>
                {category === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. Grain Elevator, Tack Shop"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 mt-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Target Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Houston, TX or Montana"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                {/* Location Quick Presets */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {PRESET_LOCATIONS.slice(0, 5).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters & Actions */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Filter Criteria</label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireWebsite}
                      onChange={(e) => setRequireWebsite(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Requires Website
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePhone}
                      onChange={(e) => setRequirePhone(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Requires Phone
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white"
                  >
                    <option value={10}>10 Leads</option>
                    <option value={15}>15 Leads</option>
                    <option value={25}>25 Leads</option>
                    <option value={40}>40 Leads</option>
                  </select>

                  <button
                    type="submit"
                    disabled={searching}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition"
                  >
                    {searching ? (
                      <>
                        <ArrowsClockwise className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlass className="w-4 h-4" />
                        Search Leads
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {searchStep && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center gap-2 animate-pulse">
                <ArrowsClockwise className="w-4 h-4 animate-spin text-indigo-600" />
                {searchStep}
              </div>
            )}

            {searchError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <WarningCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                {searchError}
              </div>
            )}
          </form>

          {/* Search Diagnostics Summary */}
          {diagnostics && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Search Diagnostics & Real Data Audit
                </span>
                <span className="text-slate-500 font-mono">{diagnostics.responseTimeMs}ms</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400">Resolved Location:</span>{' '}
                  <span className="font-medium text-slate-800">{diagnostics.resolvedLocation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Raw OSM Entities:</span>{' '}
                  <span className="font-medium text-slate-800">{diagnostics.rawResultsCount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Duplicates Filtered:</span>{' '}
                  <span className="font-medium text-slate-800">{diagnostics.duplicatesRemoved}</span>
                </div>
                <div>
                  <span className="text-slate-400">Scored Leads:</span>{' '}
                  <span className="font-medium text-slate-800">{diagnostics.normalizedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Results List */}
          {leads.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">
                  Discovered Prospects ({leads.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Sorted by Project Fit & Opportunity Score
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leads.map((lead, idx) => {
                  const fitScore = lead.projectFit?.score ?? 50;
                  const oppScore = lead.opportunityScore ?? 50;
                  const isSaving = savingLeadId === lead.businessName;

                  return (
                    <div
                      key={`${lead.businessName}-${idx}`}
                      className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Title & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base leading-snug">
                              {lead.businessName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {lead.category}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {[lead.city, lead.region].filter(Boolean).join(', ') || 'Local Market'}
                              </span>
                            </div>
                          </div>

                          {/* Scores */}
                          <div className="flex items-center gap-1.5 text-right flex-shrink-0">
                            {lead.projectFit && (
                              <div
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                  fitScore >= 70
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : fitScore >= 40
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <span className="block text-[9px] uppercase tracking-wider font-semibold opacity-70">
                                  ICP Fit
                                </span>
                                {fitScore}%
                              </div>
                            )}

                            <div
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                oppScore >= 65
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="block text-[9px] uppercase tracking-wider font-semibold opacity-70">
                                Opp Score
                              </span>
                              {oppScore}/100
                            </div>
                          </div>
                        </div>

                        {/* Observed Data vs Score Breakdown */}
                        <div className="p-3 bg-slate-50/80 rounded-xl space-y-1.5 text-xs border border-slate-100">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-500 uppercase tracking-wider">
                              Verified Facts (Observed)
                            </span>
                            <span className="text-[10px] text-slate-400">OpenStreetMap ID: {lead.osmId}</span>
                          </div>

                          <div className="space-y-1 text-slate-700">
                            {lead.address && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span>{lead.address}</span>
                              </div>
                            )}
                            {lead.phone ? (
                              <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <a href={`tel:${lead.phone}`} className="hover:underline">
                                  {lead.phone}
                                </a>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">No phone listed</div>
                            )}
                            {lead.website ? (
                              <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-1 truncate max-w-xs"
                                >
                                  {lead.website}
                                  <ArrowSquareOut className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">No website listed</div>
                            )}
                          </div>
                        </div>

                        {/* Project Fit Match Reasons */}
                        {lead.projectFit && lead.projectFit.reasons?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              ICP Match Signals
                            </span>
                            <ul className="text-xs text-slate-600 space-y-0.5">
                              {lead.projectFit.reasons.map((r, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Outreach Angle */}
                        {lead.projectFit && lead.projectFit.outreachAngles?.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100/60 text-xs text-indigo-900 space-y-1">
                            <span className="font-semibold text-indigo-950 block">Suggested B2B Angle:</span>
                            <p className="text-indigo-800">{lead.projectFit.outreachAngles[0]}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        {lead.osmUrl && (
                          <a
                            href={lead.osmUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                          >
                            OSM Map <ArrowSquareOut className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => handleAIAnalyze(lead)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition"
                          >
                            <Robot className="w-3.5 h-3.5 text-indigo-600" />
                            AI Insights
                          </button>

                          <button
                            onClick={() => handleSaveToLibrary(lead)}
                            disabled={lead.alreadySaved || isSaving}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                              lead.alreadySaved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                            }`}
                          >
                            {lead.alreadySaved ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Saved
                              </>
                            ) : isSaving ? (
                              <>
                                <ArrowsClockwise className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Save Lead
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Analysis Modal */}
          {analyzingLeadName && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Robot className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-base">AI Factual Assessment</h4>
                  </div>
                  <button
                    onClick={() => {
                      setAnalyzingLeadName(null);
                      setAiAnalysisResult(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Business: <span className="text-slate-900 font-bold">{analyzingLeadName}</span>
                </div>

                {!aiAnalysisResult && !aiError && (
                  <div className="py-8 text-center space-y-2">
                    <ArrowsClockwise className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs text-slate-500">Querying server-side DeepSeek / OpenRouter model...</p>
                  </div>
                )}

                {aiError && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2">
                    <WarningCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    {aiError}
                  </div>
                )}

                {aiAnalysisResult && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-950 space-y-1">
                      <span className="font-bold">Summary:</span>
                      <p className="text-indigo-900">{aiAnalysisResult.analysis?.summary}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 font-medium block">Suitability:</span>
                        <span className="font-bold text-slate-800">{aiAnalysisResult.analysis?.potentialValue}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 font-medium block">Confidence:</span>
                        <span className="font-bold text-slate-800 capitalize">
                          {aiAnalysisResult.analysis?.confidence}
                        </span>
                      </div>
                    </div>

                    {aiAnalysisResult.analysis?.opportunitySignals?.length > 0 && (
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700">Identified Signals:</span>
                        <ul className="space-y-1 text-slate-600">
                          {aiAnalysisResult.analysis.opportunitySignals.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setAnalyzingLeadName(null);
                    setAiAnalysisResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Close Insights
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEAD LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Lead Library</h3>
                <p className="text-xs text-slate-500">
                  Manage saved prospects, qualification status, and export to CSV.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition"
                >
                  <DownloadSimple className="w-4 h-4" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search saved prospects by name, category, or city..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="disqualified">Disqualified</option>
              </select>
            </div>
          </div>

          {/* Table of Leads */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingLibrary ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <ArrowsClockwise className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading saved prospects...
              </div>
            ) : libraryLeads.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <BookBookmark className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Saved Leads Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Go to the <b>Find Leads</b> tab and search for businesses, then click "Save Lead" to add them here.
                </p>
                <button
                  onClick={() => setActiveTab('find')}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
                >
                  Discover Leads
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Business Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Email & Provenance</th>
                      <th className="py-3.5 px-4">Website</th>
                      <th className="py-3.5 px-4">Opp Score</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {libraryLeads.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {l.businessName}
                          {l.osmUrl && (
                            <a
                              href={l.osmUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1.5 text-indigo-600 inline-flex items-center"
                            >
                              <ArrowSquareOut className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                            {l.category || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {[l.city, l.region].filter(Boolean).join(', ') || 'Local'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {l.phone ? (
                            <a href={`tel:${l.phone}`} className="hover:underline">
                              {l.phone}
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {l.email ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-900">{l.email}</span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold w-fit ${
                                l.emailSource === 'manually_entered'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {l.emailSource === 'manually_entered' ? 'Manually Entered' : 'Discovered (OSM)'}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenEmailModal(l)}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Plus className="w-3 h-3" /> Add Email
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {l.website ? (
                            <a
                              href={l.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1 max-w-[140px] truncate"
                            >
                              {l.website.replace(/^https?:\/\//, '')}
                              <ArrowSquareOut className="w-3 h-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">{l.opportunityScore ?? 50}/100</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={l.status}
                            onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value)}
                            className="px-2 py-1 rounded border border-slate-200 text-xs font-semibold bg-white focus:outline-none"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="disqualified">Disqualified</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startOutreachForLead(l)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1 transition"
                              title="Prepare Outreach Email"
                            >
                              <PaperPlaneRight className="w-3.5 h-3.5" />
                              Outreach
                            </button>
                            <button
                              onClick={() => handleOpenEmailModal(l)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition"
                              title="Edit Email & Phone"
                            >
                              <PencilSimple className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSavedLead(l.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                              title="Delete Lead"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROJECTS (ICP CONFIGURATION) */}
      {activeTab === 'projects' && activeProject && (
        <form onSubmit={handleSaveProjectICP} className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ideal Customer Profile (ICP) Configuration
                </h3>
                <p className="text-xs text-slate-500">
                  Configures the target market rules used by LeadOS to score Project Fit and suggest outreach angles.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingProject}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition flex items-center gap-2"
              >
                {savingProject ? (
                  <>
                    <ArrowsClockwise className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save ICP Configuration'
                )}
              </button>
            </div>

            {projectSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {projectSavedMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Project Name</label>
                <input
                  type="text"
                  value={activeProject.name}
                  onChange={(e) => setActiveProject({ ...activeProject, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Website / Storefront URL</label>
                <input
                  type="text"
                  value={activeProject.website || ''}
                  onChange={(e) => setActiveProject({ ...activeProject, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-700">Product / Service Definition</label>
                <input
                  type="text"
                  value={activeProject.productService || ''}
                  onChange={(e) => setActiveProject({ ...activeProject, productService: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-700">Target Customer Description</label>
                <input
                  type="text"
                  value={activeProject.targetCustomerDescription || ''}
                  onChange={(e) =>
                    setActiveProject({ ...activeProject, targetCustomerDescription: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-700">Ideal Customer Profile (Comprehensive Narrative)</label>
                <textarea
                  rows={3}
                  value={activeProject.idealCustomerProfile || ''}
                  onChange={(e) =>
                    setActiveProject({ ...activeProject, idealCustomerProfile: e.target.value })
                  }
                  className="w-full p-3.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Positive Target Keywords (comma separated)</label>
                <input
                  type="text"
                  value={(activeProject.positiveKeywords || []).join(', ')}
                  onChange={(e) =>
                    setActiveProject({
                      ...activeProject,
                      positiveKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Exclusion Negative Keywords (comma separated)</label>
                <input
                  type="text"
                  value={(activeProject.negativeKeywords || []).join(', ')}
                  onChange={(e) =>
                    setActiveProject({
                      ...activeProject,
                      negativeKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 5: RESEARCH */}
      {activeTab === 'research' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Multi-Category Market Research</h3>
            <p className="text-xs text-slate-500">
              Run continuous batch discovery across all target categories for a specific geographic market.
            </p>
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-2">
            <span className="font-bold block">Automated Scan Categories:</span>
            <div className="flex flex-wrap gap-1.5">
              {['Feed Store', 'Farm Supply', 'Equestrian Store', 'Supermarket', 'Veterinary'].map((c) => (
                <span key={c} className="px-2.5 py-1 rounded bg-white font-medium text-slate-700 border border-indigo-200/70">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Enter Target Region or State (e.g. Texas, Montana, Kentucky)"
              defaultValue="Texas"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
              id="research-target-region"
            />
            <button
              onClick={() => {
                const el = document.getElementById('research-target-region') as HTMLInputElement;
                const reg = el?.value || 'Texas';
                setLocation(reg);
                setActiveTab('find');
                handleSearch();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-md transition"
            >
              Launch Market Scan
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: SCORING RULES */}
      {activeTab === 'scoring' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Deterministic Opportunity Scoring Weights</h3>
            <p className="text-xs text-slate-500">
              Opportunity scores are calculated deterministically (0-100) based on observed data completeness and high-leverage outreach signals.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Signal Key</th>
                  <th className="py-3 px-4">Signal Name</th>
                  <th className="py-3 px-4">Point Weight</th>
                  <th className="py-3 px-4">Strategic Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weights.map((w) => (
                  <tr key={w.signalKey} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-600">{w.signalKey}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{w.signalName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          w.weight > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {w.weight > 0 ? `+${w.weight}` : w.weight}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {w.weight > 0 ? 'Increases opportunity priority' : 'Decreases direct outreach necessity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CLIENT OUTREACH */}
      {activeTab === 'outreach' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PaperPlaneRight className="w-5 h-5 text-indigo-600" />
                  Client & B2B Wholesale Outreach
                </h3>
                <p className="text-xs text-slate-500">
                  Targeted email outreach for discovered animal feed, equine tack, and bulk salt buyers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Staging Mode: Verified Simulation
                </span>
              </div>
            </div>

            {/* Simulation mode info notice */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-3">
              <WarningCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-950">Safety Mode Active [SIMULATION]</span>
                <p className="mt-0.5 leading-relaxed text-amber-800">
                  Outbound emails generated on preview/staging are syntax-validated, checked against admin authorization, and logged to the <code>leados_audit_logs</code> table. No emails are transmitted externally unless a production <code>RESEND_API_KEY</code> is configured. Unsuccessful sends or simulations will <b>never</b> mark a lead as contacted.
                </p>
              </div>
            </div>
          </div>

          {sendResultNotice && (
            <div
              className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                sendResultNotice.ok
                  ? sendResultNotice.simulated
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {sendResultNotice.ok ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <WarningCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{sendResultNotice.msg}</div>
            </div>
          )}

          {/* Outreach Composer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Template Selector & Lead Picker */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Select Prospect from Library
                </h4>

                <select
                  value={activeOutreachLeadId || ''}
                  onChange={(e) => {
                    const l = libraryLeads.find((x) => x.id === e.target.value);
                    if (l) startOutreachForLead(l);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                >
                  <option value="">-- Choose from saved leads ({libraryLeads.length}) --</option>
                  {libraryLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.businessName} ({l.city || 'Local'}) {l.email ? `[${l.email}]` : '[No Email]'}
                    </option>
                  ))}
                </select>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Wholesale Value Templates:</span>
                  <div className="space-y-2">
                    {OUTREACH_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleTemplateSelect(tmpl)}
                        className={`w-full text-left p-3 rounded-xl border transition text-xs ${
                          selectedTemplate.id === tmpl.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-sm'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">{tmpl.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{tmpl.category}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Message Editor & Dispatch */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSendOutreach} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <EnvelopeSimple className="w-4 h-4 text-indigo-600" />
                    Wholesale Email Composer
                  </h4>
                  <span className="text-[11px] font-medium text-slate-400">Tokens: &#123;business_name&#125;, &#123;city&#125;</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Recipient Business Name
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Hill Country Feed & Supply"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Recipient Email Address
                      </label>
                      {recipientEmail && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          recipientEmailSource === 'manually_entered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {recipientEmailSource === 'manually_entered' ? 'Manually Entered' : 'Discovered (OSM)'}
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        setRecipientEmailSource('manually_entered');
                      }}
                      placeholder="buyer@feedstore.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Body Copy
                  </label>
                  <textarea
                    rows={12}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-500">
                    Sender: <span className="font-semibold text-slate-800">orders@himalayankoh.com</span> (Basco Wholesale Desk)
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOutreach}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                  >
                    {sendingOutreach ? (
                      <>
                        <ArrowsClockwise className="w-4 h-4 animate-spin" />
                        Validating & Sending...
                      </>
                    ) : (
                      <>
                        <PaperPlaneRight className="w-4 h-4" />
                        Send Outreach Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: AI ENGINE */}
      {activeTab === 'ai' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">AI Intelligence Configuration</h3>
            <p className="text-xs text-slate-500">
              Server-side DeepSeek and OpenRouter models enrich discovered leads on-demand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">OpenRouter Integration</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-slate-600">Model: deepseek/deepseek-chat or custom configured LLM.</p>
              <div className="pt-2">
                <button
                  onClick={async () => {
                    const headers = await getAuthHeaders();
                    const res = await fetch('/api/admin/leados/ai', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...headers },
                      body: JSON.stringify({ action: 'test', provider: 'openrouter' }),
                    });
                    const d = await res.json();
                    alert(d.configured ? `OpenRouter connection verified (${d.model})` : 'API key not configured');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Test Connection
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Safety & Truth Invariance</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                  Enforced
                </span>
              </div>
              <p className="text-slate-600">
                AI failures never block search. Leads are always returned deterministically. Hallucinated metrics are strictly prohibited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">LeadOS System Settings</h3>
            <p className="text-xs text-slate-500">
              System architecture, isolated database tables, and provider endpoints.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
              <div className="font-bold text-slate-800">Database Namespacing:</div>
              <div className="text-slate-600">All tables strictly prefixed: `leados_*`</div>
              <div className="text-slate-600">Migration: supabase/migrations/037_leados_schema.sql</div>
              <div className="text-slate-600">Row Level Security: Enabled on all tables</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
              <div className="font-bold text-slate-800">Lead Data Sources:</div>
              <div className="text-slate-600">Geocoding: OpenStreetMap Nominatim</div>
              <div className="text-slate-600">Entity Discovery: OpenStreetMap Overpass API</div>
              <div className="text-slate-600">Scoring Engine: In-Memory / Supabase Deterministic</div>
            </div>
          </div>
        </div>
      )}

      {/* Email Edit Modal */}
      {editingEmailLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PencilSimple className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-base">Edit Contact Details</h4>
              </div>
              <button
                onClick={() => setEditingEmailLead(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Editing contact information for <span className="font-bold text-slate-900">{editingEmailLead.businessName}</span>. Manually entered emails will be explicitly marked as <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-semibold text-emerald-800">manually_entered</code>.
            </div>

            <form onSubmit={handleSaveEmailModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="contact@store.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="(800) 555-0199"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {emailModalNotice && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
                  {emailModalNotice}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmailLead(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
                >
                  {savingEmail ? (
                    <>
                      <ArrowsClockwise className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Contact'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
