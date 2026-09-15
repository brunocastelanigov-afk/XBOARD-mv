import { createClient } from "jsr:@supabase/supabase-js@2";

type CampaignCategory = "upsell_02" | "webinario";

interface CampaignProductEventInput {
  eventId?: string;
  category?: CampaignCategory;
  buyerEmail?: string;
  eventType?: string;
  priceCents?: number;
  productCode?: string | null;
  productName?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmMedium?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  funnelId?: string | null;
  country?: string | null;
  funnelVariant?: string | null;
  isTest?: boolean;
}

const eventTypeMap: Record<string, string> = {
  Purchase_Order_Confirmed: "purchase",
  Payment_Refund: "refunded",
  Payment_Chargeback: "chargeback",
  order_paid: "purchase",
  refund: "refunded",
  chargeback: "chargeback",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toEventType(input: CampaignProductEventInput) {
  const action = eventTypeMap[String(input.eventType ?? "")];
  if (!action || !input.category) return null;
  if (action === "purchase") return `purchase_${input.category}`;
  return `purchase_${input.category}_${action}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const expectedToken = Deno.env.get("CAMPAIGN_EVENT_INGEST_TOKEN");
  if (!expectedToken || req.headers.get("X-Ingest-Token") !== expectedToken) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: CampaignProductEventInput;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const buyerEmail = normalizeEmail(body.buyerEmail);
  const eventType = toEventType(body);
  const priceCents = Number(body.priceCents ?? 0);
  if (!body.eventId || !body.category || !buyerEmail || !eventType || !Number.isFinite(priceCents)) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const sourceEventId = `campaign:${body.category}:${body.eventId}`;
  const { data: existing, error: existingError } = await supabase
    .from("funnel_events")
    .select("event_id")
    .eq("source_event_id", sourceEventId)
    .limit(1);

  if (existingError) return json({ ok: false, error: existingError.message }, 500);
  if (existing?.length) return json({ ok: true, message: "already_processed" });

  const hasPayloadUtm = Boolean(body.utmSource || body.utmCampaign || body.utmMedium);
  const { data: frontSale, error: frontSaleError } = await supabase
    .from("funnel_events")
    .select("lead_id,funnel_id,country,funnel_variant,metadata")
    .eq("event_type", "purchase")
    .eq("metadata->>buyer_email", buyerEmail)
    .order("event_timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (frontSaleError) return json({ ok: false, error: frontSaleError.message }, 500);

  const metadata = (frontSale?.metadata ?? {}) as Record<string, unknown>;
  const attributionStatus = frontSale || hasPayloadUtm ? "matched" : "unmatched";
  const utmSource = body.utmSource ?? (metadata.utm_source as string | undefined) ?? null;
  const utmCampaign = body.utmCampaign ?? (metadata.utm_campaign as string | undefined) ?? null;
  const utmMedium = body.utmMedium ?? (metadata.utm_medium as string | undefined) ?? null;

  const { error: insertError } = await supabase.from("funnel_events").insert({
    source_event_id: sourceEventId,
    event_type: eventType,
    lead_id: frontSale?.lead_id ?? `lead_unmatched_${sourceEventId}`,
    funnel_id: body.funnelId ?? frontSale?.funnel_id ?? "unmatched",
    country: body.country ?? frontSale?.country ?? "BR",
    funnel_variant: body.funnelVariant ?? frontSale?.funnel_variant ?? null,
    event_timestamp: new Date().toISOString(),
    metadata: {
      source: body.category === "webinario" ? "payt" : "lastlink",
      campaign_event_id: body.eventId,
      lastlink_event_id: body.category === "upsell_02" ? body.eventId : null,
      buyer_email: buyerEmail,
      price_cents: Math.round(priceCents),
      product_category: body.category,
      product_code: body.productCode ?? null,
      product_name: body.productName ?? null,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
      utm_medium: utmMedium,
      utm_content: body.utmContent ?? (metadata.utm_content as string | undefined) ?? null,
      utm_term: body.utmTerm ?? (metadata.utm_term as string | undefined) ?? null,
      attribution_status: attributionStatus,
      is_test: body.isTest === true,
    },
  });

  if (insertError) {
    if (insertError.code === "23505") return json({ ok: true, message: "already_processed" });
    return json({ ok: false, error: insertError.message }, 500);
  }

  return json({ ok: true, message: "recorded", attributionStatus });
});
