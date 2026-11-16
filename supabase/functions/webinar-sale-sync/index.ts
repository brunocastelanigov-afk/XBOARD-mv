import { createClient } from "jsr:@supabase/supabase-js@2";

// Recebe em lote as vendas de webinário (Lastlink) que o main-dash já atribuiu e as grava em funnel_events.
//
// Por que existe: o banco de tráfego só recebia o webinário da Payt (via campaign-product-event); as vendas de
// webinário da Lastlink não chegavam, e o ROI de Campanhas (principalmente TikTok) ficava subcontado.
// O main-dash é a fonte: ele resolve a origem pela compra front do mesmo comprador (e-mail em hash) e um job do
// worker dele chama esta função. Não há e-mail em claro aqui — a atribuição já vem resolvida em utm_*.
//
// Idempotente: source_event_id = "maindash:webinar:<id do evento no main-dash>" (índice único). Reenviar o mesmo
// lote não duplica. Auth: header X-Ingest-Token = secret WEBINAR_SYNC_TOKEN (verify_jwt desligado: o chamador é o
// worker do main-dash, sem JWT de usuário).

type SyncEventType =
  | "purchase_webinario"
  | "purchase_webinario_refunded"
  | "purchase_webinario_chargeback";

const EVENT_TYPES: ReadonlySet<string> = new Set([
  "purchase_webinario",
  "purchase_webinario_refunded",
  "purchase_webinario_chargeback",
]);
const TRAFFIC_SOURCES: ReadonlySet<string> = new Set(["facebook", "tiktok", "google", "organic", "unknown"]);
const MAX_BATCH = 500;

interface SyncEvent {
  sourceEventId?: string;
  eventType?: SyncEventType;
  occurredAt?: string;
  paymentId?: string | null;
  priceCents?: number;
  productCode?: string | null;
  productName?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmMedium?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  trafficSourceId?: string | null;
  buyerRef?: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function str(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

function toRow(e: SyncEvent) {
  const sourceEventId = str(e.sourceEventId);
  const occurredAt = str(e.occurredAt);
  const price = Number(e.priceCents ?? 0);
  if (!sourceEventId?.startsWith("maindash:webinar:")) return null;
  if (!e.eventType || !EVENT_TYPES.has(e.eventType)) return null;
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) return null;
  if (!Number.isFinite(price) || price < 0) return null;

  const utmSource = str(e.utmSource);
  const utmCampaign = str(e.utmCampaign);
  const utmMedium = str(e.utmMedium);
  const trafficSource = str(e.trafficSourceId);

  return {
    source_event_id: sourceEventId,
    event_type: e.eventType,
    lead_id: `lead_unmatched_${sourceEventId}`,
    // Mesmo funil/variante de todas as compras front (o dash filtra por eles); com "unmatched" o webinário sumia
    // quando o filtro de funil estava selecionado.
    funnel_id: "desafio_treino_trinca",
    country: "BR",
    funnel_variant: "inlead",
    event_timestamp: new Date(occurredAt).toISOString(),
    traffic_source_id: trafficSource && TRAFFIC_SOURCES.has(trafficSource) ? trafficSource : null,
    metadata: {
      source: "lastlink",
      synced_from: "main-dash",
      payment_id: str(e.paymentId),
      buyer_ref: str(e.buyerRef),
      price_cents: Math.round(price),
      product_category: "webinario",
      product_code: str(e.productCode),
      product_name: str(e.productName),
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      utm_medium: utmMedium,
      utm_content: str(e.utmContent),
      utm_term: str(e.utmTerm),
      // Reembolso/chargeback herdam a UTM da venda original; sem nenhuma UTM a venda fica fora da receita atribuída.
      attribution_status: utmSource || utmCampaign || utmMedium ? "matched" : "unmatched",
      is_test: false,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // Token próprio (não reaproveita o do worker do app, para poder girar um sem afetar o outro).
  const expectedToken = Deno.env.get("WEBINAR_SYNC_TOKEN");
  if (!expectedToken || req.headers.get("X-Ingest-Token") !== expectedToken) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: { events?: SyncEvent[] };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const events = body.events;
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_BATCH) {
    return json({ ok: false, error: "invalid_batch", max: MAX_BATCH }, 400);
  }

  const rows = events.map(toRow);
  const invalid = rows.filter((r) => r === null).length;
  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length === 0) return json({ ok: false, error: "no_valid_events", invalid }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ON CONFLICT (source_event_id) DO NOTHING: o índice único simples permite o PostgREST inferir o alvo.
  const { data, error } = await supabase
    .from("funnel_events")
    .upsert(valid, { onConflict: "source_event_id", ignoreDuplicates: true })
    .select("source_event_id");

  if (error) return json({ ok: false, error: error.message }, 500);

  const inserted = data?.length ?? 0;
  return json({ ok: true, received: events.length, invalid, inserted, duplicates: valid.length - inserted });
});
