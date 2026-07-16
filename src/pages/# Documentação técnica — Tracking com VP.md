# Documentação técnica — Tracking com VPS e fallback na Cloudflare

## 1. Objetivo

Construir um sistema de captura de eventos de funis com:

* VPS como infraestrutura principal.
* PostgreSQL como banco definitivo.
* Cloudflare Worker como endpoint de contingência.
* Cloudflare D1 como armazenamento temporário.
* Recuperação automática dos eventos quando a VPS voltar.
* Deduplicação para impedir eventos duplicados.
* Baixo custo e compatibilidade com os planos gratuitos da Cloudflare.

A Cloudflare não realiza esse fallback automaticamente. Ele será implementado no SDK de tracking e no Worker.

---

# 2. Arquitetura

## Operação normal

```text
Página do funil
      ↓
SDK de tracking
      ↓
track.seudominio.com
      ↓
Cloudflare Proxy
      ↓
VPS / Easypanel
      ↓
API de tracking
      ↓
PostgreSQL
```

## Quando a VPS falhar

```text
Página do funil
      ↓
Tenta enviar para track.seudominio.com
      ↓
Timeout, erro de rede, 429 ou 5xx
      ↓
fallback-track.seudominio.com
      ↓
Cloudflare Worker
      ↓
Cloudflare D1
```

## Quando a VPS voltar

```text
Cloudflare Cron Trigger
      ↓
Worker consulta eventos pendentes no D1
      ↓
POST autenticado para a VPS
      ↓
PostgreSQL
      ↓
Worker remove os lotes recuperados do D1
```

---

# 3. Decisão de armazenamento: D1 em vez de Queue

Para esta arquitetura gratuita, o D1 é mais adequado que Cloudflare Queues.

O Workers Free aceita até **100.000 requisições diárias**. O D1 gratuito oferece até **100.000 linhas escritas por dia** e **5 GB de armazenamento total**.

Cloudflare Queues passou a estar disponível no plano gratuito, mas oferece apenas **10.000 operações diárias** e retenção máxima de **24 horas**. Uma mensagem normalmente consome três operações: escrita, leitura e remoção.

Portanto, neste projeto:

```text
Cloudflare D1 = buffer de contingência
PostgreSQL = banco definitivo
```

O D1 não será usado para relatórios, dashboards ou consultas analíticas.

---

# 4. Domínios

Utilizar dois subdomínios diferentes.

## Endpoint principal

```text
track.seudominio.com
```

Configuração:

* Registro DNS `A`.
* Aponta para o IP da VPS.
* Proxy da Cloudflare ativado, nuvem laranja.
* Roteado pelo Easypanel para a API de tracking.

## Endpoint de fallback

```text
fallback-track.seudominio.com
```

Configuração:

* Custom Domain do Cloudflare Worker.
* Não aponta para a VPS.
* Continua funcionando mesmo que a VPS esteja completamente indisponível.

Um Custom Domain pode ser configurado em:

```text
Cloudflare
→ Workers & Pages
→ Worker
→ Settings
→ Domains & Routes
→ Add
→ Custom Domain
```

A Cloudflare recomenda Custom Domains quando o Worker funciona como origem da aplicação.

## SSL

Na Cloudflare:

```text
SSL/TLS → Encryption Mode → Full (strict)
```

A origem da VPS deve possuir certificado válido, emitido pelo Easypanel, Let's Encrypt ou Cloudflare Origin CA. A Cloudflare recomenda `Full` ou `Full (strict)` e considera `Full (strict)` a opção mais segura quando a origem possui certificado válido.

---

# 5. Contrato dos eventos

Cada evento deve possuir um identificador único criado no navegador.

```typescript
interface TrackingEvent {
  event_id: string;
  event_name: string;
  funnel_id: string;
  occurred_at: string;

  visitor_id?: string;
  session_id?: string;
  page_url?: string;
  referrer?: string;

  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };

  metadata?: Record<string, unknown>;
}
```

Exemplo:

```json
{
  "event_id": "1be89b80-af53-41cc-a828-0c58017944b7",
  "event_name": "checkout_view",
  "funnel_id": "quiz-emagrecimento-v1",
  "occurred_at": "2026-07-15T23:20:00.000Z",
  "visitor_id": "visitor_8c726e",
  "session_id": "session_47de21",
  "page_url": "https://oferta.exemplo.com/checkout",
  "utm": {
    "source": "facebook",
    "campaign": "campanha-01"
  },
  "metadata": {
    "step": 17
  }
}
```

## Lote de eventos

Os eventos devem ser agrupados no navegador:

```typescript
interface EventBatch {
  batch_id: string;
  sent_at: string;
  sdk_version: string;
  events: TrackingEvent[];
}
```

Limites recomendados:

```text
Máximo de eventos por lote: 20
Tamanho máximo do lote: 48 KB
Intervalo de envio: 1 segundo
```

O agrupamento reduz:

* Requisições à VPS.
* Requisições ao Worker.
* Escritas no D1.
* Conexões e operações no PostgreSQL.

---

# 6. Regra de fallback

O fallback não deve ser acionado em qualquer erro.

| Resposta principal           | Comportamento                                                 |
| ---------------------------- | ------------------------------------------------------------- |
| `200`, `201`, `202` ou `204` | Evento confirmado                                             |
| `409`                        | Considerar confirmado; provavelmente duplicado                |
| `400`, `401`, `403` ou `422` | Não enviar ao fallback; existe erro no evento ou configuração |
| `408`                        | Enviar ao fallback                                            |
| `429`                        | Enviar ao fallback                                            |
| `500` a `599`                | Enviar ao fallback                                            |
| Timeout                      | Enviar ao fallback                                            |
| Erro de rede                 | Enviar ao fallback                                            |

Se o fallback também falhar, o lote permanece no armazenamento local do navegador para uma nova tentativa.

---

# 7. SDK do navegador

## Implementação de referência

```javascript
const TRACKING_CONFIG = {
  primaryUrl: "https://track.seudominio.com/v1/events/batch",
  fallbackUrl: "https://fallback-track.seudominio.com/v1/events/batch",
  funnelId: "meu-funil",
  sdkVersion: "1.0.0",
  flushIntervalMs: 1000,
  requestTimeoutMs: 2500,
  maxBatchSize: 20,
  maxStoredEvents: 500
};

const STORAGE_KEY = "__tracking_pending_events__";

let flushing = false;

function readPendingEvents() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function savePendingEvents(events) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-TRACKING_CONFIG.maxStoredEvents))
    );
  } catch {
    // Se o armazenamento estiver indisponível, o evento continuará
    // existindo apenas na memória desta execução.
  }
}

function createEvent(eventName, metadata = {}) {
  return {
    event_id: crypto.randomUUID(),
    event_name: eventName,
    funnel_id: TRACKING_CONFIG.funnelId,
    occurred_at: new Date().toISOString(),
    visitor_id: getOrCreateVisitorId(),
    session_id: getOrCreateSessionId(),
    page_url: location.href,
    referrer: document.referrer || null,
    utm: readUtmParameters(),
    metadata
  };
}

function getOrCreateVisitorId() {
  const key = "__tracking_visitor_id__";
  let id = localStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }

  return id;
}

function getOrCreateSessionId() {
  const key = "__tracking_session_id__";
  let id = sessionStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }

  return id;
}

function readUtmParameters() {
  const params = new URLSearchParams(location.search);

  return {
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
    campaign: params.get("utm_campaign") || undefined,
    content: params.get("utm_content") || undefined,
    term: params.get("utm_term") || undefined
  };
}

async function postWithTimeout(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TRACKING_CONFIG.requestTimeoutMs
  );

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      keepalive: true
    });
  } finally {
    clearTimeout(timeout);
  }
}

function shouldUseFallback(response) {
  return (
    response.status === 408 ||
    response.status === 429 ||
    response.status >= 500
  );
}

async function deliverBatch(batch) {
  try {
    const primaryResponse = await postWithTimeout(
      TRACKING_CONFIG.primaryUrl,
      batch
    );

    if (primaryResponse.ok || primaryResponse.status === 409) {
      return true;
    }

    if (!shouldUseFallback(primaryResponse)) {
      console.error(
        "Tracking rejeitado pela API principal:",
        primaryResponse.status
      );

      // Não repetir indefinidamente eventos inválidos.
      return true;
    }
  } catch {
    // Timeout ou erro de rede: segue para o fallback.
  }

  try {
    const fallbackResponse = await postWithTimeout(
      TRACKING_CONFIG.fallbackUrl,
      batch
    );

    return fallbackResponse.ok || fallbackResponse.status === 409;
  } catch {
    return false;
  }
}

async function flushTrackingEvents() {
  if (flushing) return;

  const pending = readPendingEvents();
  if (pending.length === 0) return;

  flushing = true;

  const events = pending.slice(0, TRACKING_CONFIG.maxBatchSize);

  const batch = {
    batch_id: crypto.randomUUID(),
    sent_at: new Date().toISOString(),
    sdk_version: TRACKING_CONFIG.sdkVersion,
    events
  };

  try {
    const delivered = await deliverBatch(batch);

    if (delivered) {
      savePendingEvents(pending.slice(events.length));
    }
  } finally {
    flushing = false;
  }
}

function track(eventName, metadata = {}) {
  const pending = readPendingEvents();

  pending.push(createEvent(eventName, metadata));
  savePendingEvents(pending);

  if (pending.length >= TRACKING_CONFIG.maxBatchSize) {
    void flushTrackingEvents();
  }
}

setInterval(
  () => void flushTrackingEvents(),
  TRACKING_CONFIG.flushIntervalMs
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    void flushTrackingEvents();
  }
});
```

Uso:

```javascript
track("page_view");

track("quiz_answer", {
  question_id: "question_07",
  answer: "yes"
});

track("checkout_view", {
  product_id: "product_01"
});
```

## Observação sobre conversões

Eventos de compra devem preferencialmente ser registrados também por:

```text
Webhook do gateway de pagamento
ou
Backend do checkout
```

O tracking do navegador pode ser bloqueado por extensões, fechamento da página, falhas de conexão ou JavaScript desativado.

---

# 8. Banco PostgreSQL da VPS

## Tabela principal

```sql
CREATE TABLE public.funnel_events (
  event_id UUID PRIMARY KEY,

  funnel_id TEXT NOT NULL,
  event_name TEXT NOT NULL,

  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  visitor_id TEXT,
  session_id TEXT,

  page_url TEXT,
  referrer TEXT,

  utm JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  ingest_source TEXT NOT NULL
    CHECK (ingest_source IN ('primary', 'fallback'))
);
```

## Índices

```sql
CREATE INDEX idx_funnel_events_funnel_occurred
  ON public.funnel_events (funnel_id, occurred_at DESC);

CREATE INDEX idx_funnel_events_name_occurred
  ON public.funnel_events (event_name, occurred_at DESC);

CREATE INDEX idx_funnel_events_session
  ON public.funnel_events (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX idx_funnel_events_utm_source
  ON public.funnel_events ((utm->>'source'));
```

A chave primária em `event_id` garante idempotência.

Se um evento chegar pela VPS e depois for reenviado pelo fallback:

```sql
ON CONFLICT (event_id) DO NOTHING
```

O PostgreSQL mantém somente uma cópia.

---

# 9. API principal da VPS

## Endpoints

```text
POST /v1/events/batch
POST /v1/recovery/batches
GET  /health
```

## Endpoint público

```text
POST /v1/events/batch
```

Recebe lotes diretamente dos funis.

Resposta:

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
```

```json
{
  "accepted": true
}
```

## Endpoint privado de recuperação

```text
POST /v1/recovery/batches
```

Este endpoint:

* Não é chamado pelo navegador.
* Só é chamado pelo Cloudflare Worker.
* Exige `Authorization: Bearer`.
* Recebe múltiplos lotes.
* Insere os eventos com `ON CONFLICT DO NOTHING`.

Exemplo de corpo:

```json
{
  "batches": [
    {
      "batch_id": "efb10308-9e40-47cb-96ba-6a35233d340d",
      "sent_at": "2026-07-15T23:30:00.000Z",
      "sdk_version": "1.0.0",
      "events": []
    }
  ]
}
```

---

# 10. Inserção dos eventos na VPS

Exemplo usando Node.js, Fastify e PostgreSQL:

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import { Pool } from "pg";
import { timingSafeEqual } from "node:crypto";

const app = Fastify({
  logger: true,
  bodyLimit: 512 * 1024
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000
});

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
);

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin não autorizada"), false);
  },
  methods: ["POST", "OPTIONS"]
});

function isAuthorizedRecoveryRequest(
  authorizationHeader: string | undefined
) {
  const expected = `Bearer ${process.env.RECOVERY_TOKEN ?? ""}`;
  const received = authorizationHeader ?? "";

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(received),
    Buffer.from(expected)
  );
}

async function insertEvents(
  events: any[],
  ingestSource: "primary" | "fallback"
) {
  if (!Array.isArray(events) || events.length === 0) {
    return;
  }

  const values: unknown[] = [];

  const placeholders = events.map((event, index) => {
    const offset = index * 11;

    values.push(
      event.event_id,
      event.funnel_id,
      event.event_name,
      event.occurred_at,
      event.visitor_id ?? null,
      event.session_id ?? null,
      event.page_url ?? null,
      event.referrer ?? null,
      JSON.stringify(event.utm ?? {}),
      JSON.stringify(event.metadata ?? {}),
      ingestSource
    );

    return `(
      $${offset + 1},
      $${offset + 2},
      $${offset + 3},
      $${offset + 4},
      $${offset + 5},
      $${offset + 6},
      $${offset + 7},
      $${offset + 8},
      $${offset + 9}::jsonb,
      $${offset + 10}::jsonb,
      $${offset + 11}
    )`;
  });

  await pool.query(
    `
      INSERT INTO public.funnel_events (
        event_id,
        funnel_id,
        event_name,
        occurred_at,
        visitor_id,
        session_id,
        page_url,
        referrer,
        utm,
        metadata,
        ingest_source
      )
      VALUES ${placeholders.join(",")}
      ON CONFLICT (event_id) DO NOTHING
    `,
    values
  );
}

app.get("/health", async () => {
  await pool.query("SELECT 1");

  return {
    status: "ok"
  };
});

app.post("/v1/events/batch", async (request, reply) => {
  const batch = request.body as any;

  if (
    !batch ||
    !Array.isArray(batch.events) ||
    batch.events.length < 1 ||
    batch.events.length > 20
  ) {
    return reply.code(422).send({
      error: "Invalid batch"
    });
  }

  await insertEvents(batch.events, "primary");

  return reply.code(202).send({
    accepted: true
  });
});

app.post("/v1/recovery/batches", async (request, reply) => {
  if (!isAuthorizedRecoveryRequest(request.headers.authorization)) {
    return reply.code(401).send({
      error: "Unauthorized"
    });
  }

  const body = request.body as any;

  if (!body || !Array.isArray(body.batches)) {
    return reply.code(422).send({
      error: "Invalid recovery payload"
    });
  }

  const events = body.batches.flatMap(
    (batch: any) => Array.isArray(batch.events) ? batch.events : []
  );

  // Divisão para evitar queries excessivamente grandes.
  const chunkSize = 200;

  for (let index = 0; index < events.length; index += chunkSize) {
    await insertEvents(
      events.slice(index, index + chunkSize),
      "fallback"
    );
  }

  return reply.code(202).send({
    accepted: true,
    received_events: events.length
  });
});

await app.listen({
  host: "0.0.0.0",
  port: Number(process.env.PORT ?? 3000)
});
```

---

# 11. Banco temporário D1

## Migration

Arquivo:

```text
migrations/0001_create_fallback_batches.sql
```

Conteúdo:

```sql
CREATE TABLE IF NOT EXISTS fallback_batches (
  batch_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  payload TEXT NOT NULL
);
```

Não é necessário criar índices adicionais inicialmente.

A tabela deve permanecer pequena porque os registros são removidos assim que a VPS confirma a recuperação.

---

# 12. Configuração do Worker

## `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",

  "name": "tracker-fallback",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-15",

  "routes": [
    {
      "pattern": "fallback-track.seudominio.com",
      "custom_domain": true
    }
  ],

  "d1_databases": [
    {
      "binding": "FALLBACK_DB",
      "database_name": "tracker-fallback",
      "database_id": "SUBSTITUIR_PELO_DATABASE_ID"
    }
  ],

  "triggers": {
    "crons": [
      "* * * * *"
    ]
  },

  "vars": {
    "RECOVERY_URL": "https://track.seudominio.com/v1/recovery/batches",
    "ALLOWED_ORIGINS": "https://funil1.com,https://funil2.com"
  },

  "secrets": {
    "required": [
      "RECOVERY_TOKEN"
    ]
  }
}
```

O Cron Trigger executará o Worker uma vez por minuto. Cron Triggers utilizam UTC, embora isso não tenha impacto em uma expressão executada a cada minuto.

A URL pode ficar em `vars`, mas o token deve ser armazenado como Secret. A Cloudflare recomenda não colocar credenciais no código ou no arquivo de configuração.

---

# 13. Código do Cloudflare Worker

Arquivo:

```text
src/index.ts
```

```typescript
interface Env {
  FALLBACK_DB: D1Database;
  RECOVERY_URL: string;
  RECOVERY_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

interface StoredBatch {
  batch_id: string;
  received_at: number;
  payload: string;
}

const MAX_EVENTS_PER_BATCH = 20;
const MAX_BODY_BYTES = 48 * 1024;
const MAX_RECOVERY_BATCHES = 50;

function getAllowedOrigins(env: Env) {
  return new Set(
    env.ALLOWED_ORIGINS
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)
  );
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: HeadersInit = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

function isValidBatch(batch: any) {
  if (!batch || typeof batch !== "object") {
    return false;
  }

  if (
    typeof batch.batch_id !== "string" ||
    typeof batch.sent_at !== "string" ||
    !Array.isArray(batch.events)
  ) {
    return false;
  }

  if (
    batch.events.length < 1 ||
    batch.events.length > MAX_EVENTS_PER_BATCH
  ) {
    return false;
  }

  return batch.events.every((event: any) => {
    return (
      event &&
      typeof event.event_id === "string" &&
      typeof event.event_name === "string" &&
      typeof event.funnel_id === "string" &&
      typeof event.occurred_at === "string"
    );
  });
}

async function receiveFallbackBatch(
  request: Request,
  env: Env,
  origin: string
) {
  const contentLength = Number(
    request.headers.get("content-length") ?? "0"
  );

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(
      { error: "Payload too large" },
      413,
      corsHeaders(origin)
    );
  }

  const rawBody = await request.text();

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse(
      { error: "Payload too large" },
      413,
      corsHeaders(origin)
    );
  }

  let batch: unknown;

  try {
    batch = JSON.parse(rawBody);
  } catch {
    return jsonResponse(
      { error: "Invalid JSON" },
      400,
      corsHeaders(origin)
    );
  }

  if (!isValidBatch(batch)) {
    return jsonResponse(
      { error: "Invalid batch" },
      422,
      corsHeaders(origin)
    );
  }

  await env.FALLBACK_DB
    .prepare(
      `
        INSERT OR IGNORE INTO fallback_batches (
          batch_id,
          received_at,
          payload
        )
        VALUES (?, ?, ?)
      `
    )
    .bind(
      (batch as any).batch_id,
      Date.now(),
      rawBody
    )
    .run();

  return jsonResponse(
    {
      accepted: true,
      stored_in_fallback: true
    },
    202,
    corsHeaders(origin)
  );
}

async function recoverPendingBatches(env: Env) {
  const query = await env.FALLBACK_DB
    .prepare(
      `
        SELECT batch_id, received_at, payload
        FROM fallback_batches
        ORDER BY received_at ASC
        LIMIT ?
      `
    )
    .bind(MAX_RECOVERY_BATCHES)
    .all<StoredBatch>();

  const rows = query.results ?? [];

  if (rows.length === 0) {
    return;
  }

  const batches = rows.map(row => JSON.parse(row.payload));

  let response: Response;

  try {
    response = await fetch(env.RECOVERY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RECOVERY_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batches
      })
    });
  } catch (error) {
    console.error("VPS ainda indisponível:", error);
    return;
  }

  if (!response.ok) {
    console.error(
      "Recuperação rejeitada pela VPS:",
      response.status
    );

    return;
  }

  const deleteStatements = rows.map(row =>
    env.FALLBACK_DB
      .prepare(
        "DELETE FROM fallback_batches WHERE batch_id = ?"
      )
      .bind(row.batch_id)
  );

  await env.FALLBACK_DB.batch(deleteStatements);

  console.log(
    `Recuperados e removidos ${rows.length} lotes do D1`
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? "";
    const allowedOrigins = getAllowedOrigins(env);

    if (!allowedOrigins.has(origin)) {
      return jsonResponse(
        { error: "Origin not allowed" },
        403
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (
      request.method !== "POST" ||
      url.pathname !== "/v1/events/batch"
    ) {
      return jsonResponse(
        { error: "Not found" },
        404,
        corsHeaders(origin)
      );
    }

    try {
      return await receiveFallbackBatch(
        request,
        env,
        origin
      );
    } catch (error) {
      console.error("Erro ao armazenar fallback:", error);

      return jsonResponse(
        { error: "Fallback storage unavailable" },
        503,
        corsHeaders(origin)
      );
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(recoverPendingBatches(env));
  }
};
```

O `D1Database.batch()` executa uma sequência de prepared statements como uma transação.

---

# 14. Criação e deploy do Worker

## Criar o projeto

```bash
npm create cloudflare@latest tracker-fallback
cd tracker-fallback
```

## Criar o D1

```bash
npx wrangler d1 create tracker-fallback
```

Copiar o `database_id` retornado e colocá-lo no `wrangler.jsonc`.

## Executar migration

```bash
npx wrangler d1 execute tracker-fallback \
  --remote \
  --file=migrations/0001_create_fallback_batches.sql
```

## Criar o segredo

```bash
npx wrangler secret put RECOVERY_TOKEN
```

O mesmo valor deve ser configurado no Easypanel como:

```text
RECOVERY_TOKEN
```

## Publicar

```bash
npx wrangler deploy
```

---

# 15. Configuração no Easypanel

## Serviços

```text
Projeto: tracking

├── tracker-api
└── tracker-postgres
```

## API

Configuração sugerida:

```text
Porta interna: 3000
Domínio: track.seudominio.com
Health check: /health
Restart policy: always
```

Variáveis:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@tracker-postgres:5432/tracking
RECOVERY_TOKEN=token-aleatorio-longo
ALLOWED_ORIGINS=https://funil1.com,https://funil2.com
```

## PostgreSQL

Configuração:

```text
Exposição pública: desativada
Volume persistente: ativado
Backup externo: diário
```

A porta `5432` não deve ser publicada na internet.

---

# 16. Segurança

## Endpoint público

O endpoint chamado pelo navegador deve ser considerado público.

Não coloque no JavaScript:

* Senha de banco.
* Token privado da VPS.
* `RECOVERY_TOKEN`.
* Chave administrativa.
* Service Role Key.

Uma identificação pública por funil pode ser usada:

```http
X-Funnel-ID: meu-funil
```

Ela serve para organização e rate limiting, não como segredo.

## Proteções recomendadas

Na API e no Worker:

```text
Máximo de 20 eventos por lote
Máximo de 48 KB por requisição
Lista de origins permitidas
Validação de event_name
Validação de funnel_id
Limite de metadata
Rate limit por IP
Rejeição de campos desconhecidos quando necessário
```

O cabeçalho `Origin` reduz abuso vindo de navegadores, mas não impede que um cliente externo simule requisições. Todo evento recebido deve ser tratado como dado não confiável.

## Endpoint de recuperação

O endpoint:

```text
/v1/recovery/batches
```

deve exigir o token privado compartilhado entre Worker e VPS.

---

# 17. Idempotência

A arquitetura possui três níveis de deduplicação.

## Batch no D1

```sql
batch_id TEXT PRIMARY KEY
```

O mesmo lote não é armazenado duas vezes.

## Evento no PostgreSQL

```sql
event_id UUID PRIMARY KEY
```

O mesmo evento não é armazenado duas vezes.

## Inserção

```sql
ON CONFLICT (event_id) DO NOTHING
```

Consequentemente, este cenário é seguro:

```text
Evento chega na VPS
        +
Navegador interpreta timeout
        +
Evento chega ao fallback
        +
Worker reenvia posteriormente
        =
Somente uma linha no PostgreSQL
```

---

# 18. Monitoramento

## Métricas mínimas da VPS

Monitorar:

```text
Requisições por minuto
Eventos recebidos por minuto
Erros 4xx
Erros 5xx
Latência p95
Uso de CPU
Uso de RAM
Uso de disco
Conexões PostgreSQL
```

## Métricas do fallback

Monitorar:

```text
Quantidade de lotes no D1
Lote mais antigo no D1
Eventos recebidos pelo fallback
Falhas na recuperação
Última recuperação bem-sucedida
```

Consulta manual no D1:

```sql
SELECT
  COUNT(*) AS pending_batches,
  MIN(received_at) AS oldest_batch
FROM fallback_batches;
```

## Alerta recomendado

Criar alerta quando:

```text
fallback_batches > 0 por mais de 5 minutos
```

Isso significa que a VPS está indisponível ou rejeitando a recuperação.

---

# 19. Estimativa de capacidade

Cenário:

```text
10.000 visitantes por dia
5 eventos por visitante
50.000 eventos por dia
```

Com lotes médios de 10 eventos:

```text
50.000 eventos
÷ 10 eventos por lote
= 5.000 lotes
```

Em uma queda da VPS durante o dia inteiro:

```text
Worker: aproximadamente 5.000 requisições
D1: aproximadamente 5.000 inserções
Recuperação: aproximadamente 5.000 exclusões
```

Isso representa aproximadamente:

```text
5.000 requisições de 100.000 permitidas
10.000 alterações de linhas de 100.000 permitidas
```

Essa estimativa não considera operações adicionais internas ou mudanças futuras de limites, mas mantém uma margem ampla para o cenário descrito. Os limites atuais são de 100.000 requisições diárias no Workers Free e 100.000 linhas escritas diariamente no D1 Free.

Sem agrupamento, 50.000 eventos individuais exigiriam:

```text
50.000 requisições
50.000 inserções
50.000 exclusões
```

Por isso, o batching não é apenas uma otimização: ele é parte importante da arquitetura gratuita.

---

# 20. Plano de testes

## Teste 1 — Operação normal

1. Manter a VPS online.
2. Disparar um evento.
3. Confirmar resposta `202`.
4. Confirmar linha no PostgreSQL.
5. Confirmar que o D1 continua vazio.

Resultado esperado:

```text
ingest_source = primary
```

## Teste 2 — Queda da VPS

1. Parar o container da API.
2. Disparar eventos pelo funil.
3. Confirmar que a tentativa principal falha.
4. Confirmar resposta `202` do fallback.
5. Consultar o D1.

Resultado esperado:

```sql
SELECT * FROM fallback_batches;
```

deve retornar os lotes.

## Teste 3 — Recuperação

1. Subir novamente a API.
2. Aguardar o Cron Trigger.
3. Confirmar eventos no PostgreSQL.
4. Confirmar que os lotes foram removidos do D1.

Resultado esperado:

```text
ingest_source = fallback
```

## Teste 4 — Duplicação

1. Enviar duas vezes o mesmo `event_id`.
2. Consultar o PostgreSQL.

Resultado esperado:

```sql
SELECT COUNT(*)
FROM funnel_events
WHERE event_id = 'UUID_TESTADO';
```

Resultado:

```text
1
```

## Teste 5 — Falha dupla

1. Parar a VPS.
2. Desabilitar temporariamente o Worker.
3. Disparar um evento.
4. Reativar os dois serviços.
5. Aguardar uma nova tentativa do navegador.

Resultado esperado:

```text
O evento permanece no localStorage até ser aceito.
```

## Teste 6 — Origem não permitida

Enviar uma requisição com outra origem.

Resultado esperado:

```http
403 Forbidden
```

## Teste 7 — Payload excessivo

Enviar mais de 48 KB.

Resultado esperado:

```http
413 Payload Too Large
```

---

# 21. Ordem de implementação

## Fase 1

```text
PostgreSQL
API principal
Domínio track.seudominio.com
SDK sem fallback
```

## Fase 2

```text
Cloudflare D1
Cloudflare Worker
Domínio fallback-track.seudominio.com
```

## Fase 3

```text
Fallback no SDK
Cron de recuperação
Endpoint privado de recovery
```

## Fase 4

```text
Monitoramento
Alertas
Backups externos
Testes de indisponibilidade
```

---

# 22. Resultado final

A arquitetura final será:

```text
                     ┌────────────────────────────┐
                     │                            │
Página → SDK → VPS → PostgreSQL                   │
             │                                    │
             └─ falhou → Worker → D1              │
                                      │           │
                                      └─ Cron ────┘
```

Princípios:

```text
VPS é o caminho principal.
Worker não é consumido em condições normais.
D1 armazena somente contingências.
PostgreSQL é a fonte definitiva.
event_id impede duplicações.
Batching reduz consumo e aumenta capacidade.
Eventos de compra também devem vir do backend.
```
