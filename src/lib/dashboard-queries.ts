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

function applyScope(query: any, filters: DashboardFilters, dateColumn: string) {
  let next = query.gte(dateColumn, filters.dateFrom).lte(dateColumn, filters.dateTo)

  if (filters.funnelId) next = next.eq("funnel_id", filters.funnelId)
  if (filters.country) next = next.eq("country", filters.country)

  if (filters.funnelVariant === "__null__") {
    next = next.is("funnel_variant", null)
  } else if (filters.funnelVariant) {
    next = next.eq("funnel_variant", filters.funnelVariant)
  }

  return next
}

async function readRows<T>(query: any) {
  const { data, error } = await query

  if (error) throw error

  return (data ?? []) as T[]
}

export async function fetchFilterOptions() {
  const query = supabase
    .from("dashboard_filter_options_view")
    .select("funnel_id,country,funnel_variant,min_event_date,max_event_date,leads")
    .order("funnel_id", { ascending: true })
    .order("country", { ascending: true })

  return readRows<DashboardFilterOption>(query)
}

export async function fetchLeadResponses(filters: DashboardFilters) {
  const query = supabase
    .from("funnel_lead_responses_view")
    .select(
      "funnel_id,country,funnel_variant,lead_id,first_seen_at,last_seen_at,lead_date,lead_name,lead_email,lead_phone,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,xcod,sck,src,device_type,steps,events,metadata"
    )
    .order("last_seen_at", { ascending: false })
    .limit(500)

  return readRows<LeadResponseRow>(applyScope(query, filters, "lead_date"))
}

export async function fetchStepResults(filters: DashboardFilters) {
  const query = supabase
    .from("funnel_step_results_view")
    .select(
      "funnel_id,country,funnel_variant,event_date,step_number,step_name,entries,first_step_entries,passage_rate,advances,interaction_rate,average_time_seconds,answer_distribution,click_distribution"
    )
    .order("step_number", { ascending: true })

  return readRows<StepResultRow>(applyScope(query, filters, "event_date"))
}

export async function fetchPerformance(filters: DashboardFilters) {
  const query = supabase
    .from("funnel_performance_view")
    .select(
      "funnel_id,country,funnel_variant,event_date,event_hour,visitors,responses_started,leads,conclusions,completion_rate,interaction_rate,rejection_rate,average_completed_steps,total_steps,average_time_seconds,score,score_formula_version,series"
    )
    .order("event_date", { ascending: true })
    .order("event_hour", { ascending: true })

  return readRows<PerformanceRow>(applyScope(query, filters, "event_date"))
}

export async function fetchCampaignPerformance(filters: DashboardFilters) {
  const query = supabase
    .from("funnel_campaign_performance_view")
    .select(
      "funnel_id,country,funnel_variant,event_date,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,xcod,sck,src,tracked_total,visitors,responses_started,leads,conclusions,completion_rate,interaction_rate,first_seen_at,last_seen_at"
    )
    .order("conclusions", { ascending: false })
    .limit(100)

  return readRows<CampaignPerformanceRow>(
    applyScope(query, filters, "event_date")
  )
}

export async function fetchDevicePerformance(filters: DashboardFilters) {
  const query = supabase
    .from("funnel_device_performance_view")
    .select(
      "funnel_id,country,funnel_variant,event_date,device_type,visitors,responses_started,leads,conclusions,share_percentage"
    )
    .order("visitors", { ascending: false })

  return readRows<DevicePerformanceRow>(applyScope(query, filters, "event_date"))
}

export async function fetchLeadAudit(
  filters: DashboardFilters,
  statusFilters: AuditStatusFilters,
  search: string
) {
  let query = supabase
    .from("funnel_lead_audit_view")
    .select(
      "funnel_id,country,funnel_variant,lead_id,first_seen_at,last_seen_at,lead_date,last_event_type,max_step_number,completed_steps,event_count,has_contact,has_ic,has_purchase,purchase_event_type,lead_name,lead_email,lead_phone,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,xcod,sck,src,device_type,entry_step_name,checkout_started_at,purchased_at,contact_collected_at,events"
    )
    .order("last_seen_at", { ascending: false })
    .limit(500)

  query = applyScope(query, filters, "lead_date")

  if (statusFilters.purchase !== "all") {
    query = query.eq("has_purchase", statusFilters.purchase === "yes")
  }
  if (statusFilters.ic !== "all") {
    query = query.eq("has_ic", statusFilters.ic === "yes")
  }
  if (statusFilters.contact !== "all") {
    query = query.eq("has_contact", statusFilters.contact === "yes")
  }

  const cleanedSearch = search.trim()
  if (cleanedSearch) {
    query = query.or(
      `lead_id.ilike.%${cleanedSearch}%,lead_email.ilike.%${cleanedSearch}%,lead_phone.ilike.%${cleanedSearch}%`
    )
  }

  return readRows<LeadAuditRow>(query)
}

export async function fetchLeadAuditSummary(filters: DashboardFilters) {
  const query = supabase
    .from("funnel_lead_audit_summary_view")
    .select(
      "funnel_id,country,funnel_variant,lead_date,leads,with_contact,without_contact,with_ic,without_ic,with_purchase,without_purchase,contact_rate,ic_rate,purchase_rate"
    )

  return readRows<LeadAuditSummaryRow>(applyScope(query, filters, "lead_date"))
}

export async function fetchLeadDetail(
  leadId: string,
  filters: Partial<DashboardFilters>
) {
  let query = supabase
    .from("funnel_lead_audit_view")
    .select(
      "funnel_id,country,funnel_variant,lead_id,first_seen_at,last_seen_at,lead_date,last_event_type,max_step_number,completed_steps,event_count,has_contact,has_ic,has_purchase,purchase_event_type,lead_name,lead_email,lead_phone,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_id,xcod,sck,src,device_type,entry_step_name,checkout_started_at,purchased_at,contact_collected_at,events"
    )
    .eq("lead_id", leadId)
    .order("last_seen_at", { ascending: false })
    .limit(10)

  if (filters.funnelId) query = query.eq("funnel_id", filters.funnelId)
  if (filters.country) query = query.eq("country", filters.country)

  if (filters.funnelVariant === "__null__") {
    query = query.is("funnel_variant", null)
  } else if (filters.funnelVariant) {
    query = query.eq("funnel_variant", filters.funnelVariant)
  }

  const rows = await readRows<LeadAuditRow>(query)
  return rows[0] ?? null
}
