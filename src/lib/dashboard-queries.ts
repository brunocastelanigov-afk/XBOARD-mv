import { supabase } from "@/lib/supabase"
import type {
  AuditStatusFilters,
  CampaignPerformanceRow,
  DashboardFilterOption,
  DashboardFilters,
  DevicePerformanceRow,
  LeadAuditRow,
  LeadAuditSummaryRow,
  LeadResponseRow,
  PerformanceRow,
  StepResultRow,
} from "@/lib/dashboard-types"

function scopeParams(filters: DashboardFilters) {
  return {
    p_funnel_id: filters.funnelId,
    p_country: filters.country,
    p_funnel_variant: filters.funnelVariant,
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
  }
}

async function readRows<T>(query: any, signal?: AbortSignal) {
  const { data, error } = await (signal ? query.abortSignal(signal) : query)

  if (error) throw error

  return (data ?? []) as T[]
}

export async function fetchFilterOptions(signal?: AbortSignal) {
  return readRows<DashboardFilterOption>(
    supabase.rpc("rpc_dashboard_filter_options"),
    signal
  )
}

export interface LeadResponsesPage {
  rows: LeadResponseRow[]
  hasMore: boolean
}

export async function fetchLeadResponses(
  filters: DashboardFilters,
  search: string,
  page: number,
  pageSize = 100,
  signal?: AbortSignal
): Promise<LeadResponsesPage> {
  const rows = await readRows<LeadResponseRow>(
    supabase.rpc("rpc_lead_responses", {
      ...scopeParams(filters),
      p_search: search.trim() || null,
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    }),
    signal
  )

  return {
    rows: rows.slice(0, pageSize),
    hasMore: rows.length > pageSize,
  }
}

export async function fetchStepResults(filters: DashboardFilters, signal?: AbortSignal) {
  return readRows<StepResultRow>(
    supabase.rpc("rpc_step_results", scopeParams(filters)),
    signal
  )
}

export async function fetchPerformance(filters: DashboardFilters, signal?: AbortSignal) {
  return readRows<PerformanceRow>(
    supabase.rpc("rpc_performance", scopeParams(filters)),
    signal
  )
}

export async function fetchCampaignPerformance(filters: DashboardFilters, signal?: AbortSignal) {
  return readRows<CampaignPerformanceRow>(
    supabase.rpc("rpc_campaign_performance", scopeParams(filters)),
    signal
  )
}

export async function fetchDevicePerformance(filters: DashboardFilters, signal?: AbortSignal) {
  return readRows<DevicePerformanceRow>(
    supabase.rpc("rpc_device_performance", scopeParams(filters)),
    signal
  )
}

export interface LeadAuditPage {
  rows: LeadAuditRow[]
  hasMore: boolean
}

export async function fetchLeadAudit(
  filters: DashboardFilters,
  statusFilters: AuditStatusFilters,
  search: string,
  page: number,
  pageSize = 100,
  signal?: AbortSignal
): Promise<LeadAuditPage> {
  const rows = await readRows<LeadAuditRow>(
    supabase.rpc("rpc_lead_audit", {
      ...scopeParams(filters),
      p_purchase: statusFilters.purchase === "all" ? null : statusFilters.purchase === "yes",
      p_ic: statusFilters.ic === "all" ? null : statusFilters.ic === "yes",
      p_contact: statusFilters.contact === "all" ? null : statusFilters.contact === "yes",
      p_search: search.trim() || null,
      p_limit: pageSize + 1,
      p_offset: page * pageSize,
    }),
    signal
  )

  return {
    rows: rows.slice(0, pageSize),
    hasMore: rows.length > pageSize,
  }
}

export async function fetchLeadAuditSummary(filters: DashboardFilters, signal?: AbortSignal) {
  return readRows<LeadAuditSummaryRow>(
    supabase.rpc("rpc_lead_audit_summary", scopeParams(filters)),
    signal
  )
}

export async function fetchLeadDetail(
  leadId: string,
  filters: Partial<DashboardFilters>,
  signal?: AbortSignal
) {
  const rows = await readRows<LeadAuditRow>(
    supabase.rpc("rpc_lead_detail", {
      p_lead_id: leadId,
      p_funnel_id: filters.funnelId ?? null,
      p_country: filters.country ?? null,
      p_funnel_variant: filters.funnelVariant ?? null,
    }),
    signal
  )
  return rows[0] ?? null
}
