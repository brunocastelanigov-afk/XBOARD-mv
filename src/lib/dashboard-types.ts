export type NullableString = string | null

export interface DashboardFilters {
  funnelId: NullableString
  country: NullableString
  funnelVariant: NullableString
  dateFrom: string
  dateTo: string
}

export interface DashboardFilterOption {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  min_event_date: string
  max_event_date: string
  leads: number
}

export interface LeadStepCell {
  step_number?: number
  step_name?: NullableString
  latest_event_type?: NullableString
  display_value?: NullableString
  answer_label?: NullableString
  answer_code?: NullableString
  answer_value?: NullableString
  button_clicked?: boolean
  advanced_at?: NullableString
  entered_at?: NullableString
}

export interface LeadResponseRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  lead_id: string
  first_seen_at: string
  last_seen_at: string
  lead_date: string
  lead_name: NullableString
  lead_email: NullableString
  lead_phone: NullableString
  utm_source: NullableString
  utm_medium: NullableString
  utm_campaign: NullableString
  utm_content: NullableString
  utm_term: NullableString
  utm_id: NullableString
  xcod: NullableString
  sck: NullableString
  src: NullableString
  device_type: NullableString
  steps: Record<string, LeadStepCell>
  events?: unknown
  metadata?: unknown
}

export interface AnswerDistributionItem {
  answer_label?: NullableString
  answer_value?: NullableString
  answer_code?: NullableString
  label?: NullableString
  value?: NullableString
  count?: number
  responses?: number
  choices?: number
  percentage?: number
}

export interface ClickDistributionItem {
  button_label?: NullableString
  button_id?: NullableString
  count?: number
  clicks?: number
  percentage?: number
}

export interface StepResultRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  event_date: string
  step_number: number
  step_name: NullableString
  entries: number
  first_step_entries: number
  passage_rate: number
  advances: number
  interaction_rate: number
  average_time_seconds: number | null
  answer_distribution: AnswerDistributionItem[] | null
  click_distribution: ClickDistributionItem[] | null
}

export interface PerformanceRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  event_date: string
  event_hour: string | null
  visitors: number
  responses_started: number
  leads: number
  conclusions: number
  completion_rate: number
  interaction_rate: number
  rejection_rate: number
  average_completed_steps: number
  total_steps: number
  average_time_seconds: number | null
  score: number
  score_formula_version: string
  series: unknown
}

export interface CampaignPerformanceRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  event_date: string
  utm_source: NullableString
  utm_medium: NullableString
  utm_campaign: NullableString
  utm_content: NullableString
  utm_term: NullableString
  utm_id: NullableString
  xcod: NullableString
  sck: NullableString
  src: NullableString
  tracked_total: number
  visitors: number
  responses_started: number
  leads: number
  conclusions: number
  completion_rate: number
  interaction_rate: number
  first_seen_at: string
  last_seen_at: string
}

export interface DevicePerformanceRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  event_date: string
  device_type: NullableString
  visitors: number
  responses_started: number
  leads: number
  conclusions: number
  share_percentage: number
}

export interface LeadAuditRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  lead_id: string
  first_seen_at: string
  last_seen_at: string
  lead_date: string
  last_event_type: NullableString
  max_step_number: number | null
  completed_steps: number | null
  event_count: number
  has_contact: boolean
  has_ic: boolean
  has_purchase: boolean
  purchase_event_type: NullableString
  lead_name: NullableString
  lead_email: NullableString
  lead_phone: NullableString
  utm_source: NullableString
  utm_medium: NullableString
  utm_campaign: NullableString
  utm_content: NullableString
  utm_term: NullableString
  utm_id: NullableString
  xcod: NullableString
  sck: NullableString
  src: NullableString
  device_type: NullableString
  entry_step_name: NullableString
  checkout_started_at: NullableString
  purchased_at: NullableString
  contact_collected_at: NullableString
  events: LeadAuditEvent[]
}

export interface LeadAuditEvent {
  event_id?: string
  event_type?: string
  step_name?: NullableString
  step_number?: number | null
  event_timestamp?: string
  answer_label?: NullableString
  button_label?: NullableString
  metadata?: Record<string, unknown>
}

export interface LeadAuditSummaryRow {
  funnel_id: string
  country: string
  funnel_variant: NullableString
  lead_date: string
  leads: number
  with_contact: number
  without_contact: number
  with_ic: number
  without_ic: number
  with_purchase: number
  without_purchase: number
  contact_rate: number
  ic_rate: number
  purchase_rate: number
}

export interface AuditStatusFilters {
  purchase: "all" | "yes" | "no"
  ic: "all" | "yes" | "no"
  contact: "all" | "yes" | "no"
}
