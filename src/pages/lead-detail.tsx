import { Link, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, MapPin, Monitor, Tag, User } from "lucide-react"
import { Badge } from "@/components/atoms/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { useDashboardQuery } from "@/hooks/use-dashboard-query"
import { fetchLeadDetail } from "@/lib/dashboard-queries"
import type { LeadAuditEvent, LeadAuditRow } from "@/lib/dashboard-types"
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format"

function statusBadge(enabled: boolean, label: string, negativeLabel: string) {
  return (
    <Badge
      variant="outline"
      className={
        enabled
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
      }
    >
      {enabled ? label : negativeLabel}
    </Badge>
  )
}

function leadName(lead: LeadAuditRow) {
  return lead.lead_name || lead.lead_email || lead.lead_phone || lead.lead_id
}

function eventDescription(event: LeadAuditEvent) {
  const details = [
    event.step_number ? `Step ${event.step_number}` : null,
    event.step_name,
    event.answer_label ? `Resposta: ${event.answer_label}` : null,
    event.button_label ? `Botão: ${event.button_label}` : null,
  ].filter(Boolean)

  return details.join(" | ") || "Evento capturado pela telemetria."
}

export function LeadDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { data: lead, error, loading } = useDashboardQuery(
    (signal) =>
      fetchLeadDetail(
        id ?? "",
        {
          funnelId: searchParams.get("funnel_id"),
          country: searchParams.get("country"),
          funnelVariant: searchParams.get("funnel_variant"),
        },
        signal
      ),
    [id, searchParams]
  )
  const events = lead?.events ?? []
  const durationSeconds =
    lead?.first_seen_at && lead.last_seen_at
      ? (new Date(lead.last_seen_at).getTime() - new Date(lead.first_seen_at).getTime()) / 1000
      : null

  return (
    <div className="flex h-full flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex items-center border-b border-border bg-card px-6 py-4">
        <Link
          to="/auditoria"
          className="mr-4 flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
        <div className="mx-2 h-4 w-px bg-border" />
        <h1 className="ml-4 font-heading text-lg font-semibold">
          Detalhes do Lead: {id}
        </h1>
        {lead && (
          <div className="ml-4 flex gap-2">
            {statusBadge(lead.has_contact, "Contato", "Sem contato")}
            {statusBadge(lead.has_ic, "IC", "Não IC")}
            {statusBadge(lead.has_purchase, "Comprou", "Não comprou")}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível carregar o lead.
          </div>
        )}

        {loading || !lead ? (
          <div className="grid min-h-[320px] place-items-center text-sm text-muted-foreground">
            {loading ? "Carregando..." : "Lead não encontrado neste escopo."}
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-shrink-0 flex-col gap-6 lg:w-80">
              <Card className="bg-card">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 font-heading text-xl font-bold text-primary">
                      {leadName(lead).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-heading text-lg font-bold">{leadName(lead)}</h2>
                      <p className="text-sm text-muted-foreground">{lead.lead_id}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Contato</div>
                        <div className="text-sm text-muted-foreground">{lead.lead_email || lead.lead_phone || "-"}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Monitor className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Dispositivo</div>
                        <div className="text-sm text-muted-foreground">{lead.device_type || "unknown"}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Escopo</div>
                        <div className="text-sm text-muted-foreground">
                          {lead.funnel_id} / {lead.country} / {lead.funnel_variant ?? "sem variante"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Duração</div>
                        <div className="text-sm text-muted-foreground">{formatDuration(durationSeconds)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">UTM Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    ["utm_source", lead.utm_source],
                    ["utm_medium", lead.utm_medium],
                    ["utm_campaign", lead.utm_campaign],
                    ["utm_content", lead.utm_content],
                    ["utm_term", lead.utm_term],
                    ["sck", lead.sck],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-border pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="max-w-[150px] truncate text-right font-mono text-sm">{value || "-"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex-1">
              <Card className="flex h-full flex-col bg-card">
                <CardHeader className="border-b border-border">
                  <CardTitle>Timeline de Eventos</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(lead.event_count)} eventos capturados entre {formatDateTime(lead.first_seen_at)} e {formatDateTime(lead.last_seen_at)}.
                  </p>
                </CardHeader>
                <CardContent className="flex-1 p-6">
                  <div className="relative ml-4 space-y-8 border-l border-border/50 pb-4 pl-6">
                    {events.map((event, index) => (
                      <div key={event.event_id ?? index} className="relative">
                        <div className="absolute -left-[43px] flex h-10 w-10 items-center justify-center rounded-full border-4 border-card bg-primary/10">
                          {event.event_type === "checkout_start" || event.event_type === "purchase" ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : event.event_type === "button_click" ? (
                            <Tag className="h-4 w-4 text-primary" />
                          ) : (
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {formatDateTime(event.event_timestamp)}
                            </span>
                            <span className="font-medium text-foreground">{event.event_type ?? "event"}</span>
                          </div>
                          <div className="mt-1 w-full rounded-md border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground md:w-3/4">
                            {eventDescription(event)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="relative pt-4">
                      <div className="absolute -left-[27px] h-2 w-2 rounded-full bg-border" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
