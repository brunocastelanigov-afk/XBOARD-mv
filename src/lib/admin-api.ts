import { supabaseCrm } from "@/lib/supabase-crm"

const apiUrl = import.meta.env.VITE_API_URL as string | undefined

if (!apiUrl) {
  throw new Error("Missing API config. Set VITE_API_URL.")
}

export class AdminApiError extends Error {
  status: number
  code?: string
  fieldErrors?: Record<string, string[]>

  constructor(message: string, status: number, code?: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = "AdminApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

type RpcResult<T> = {
  data: T | null
  error: { message: string } | null
}

async function getCrmAccessToken() {
  const { data, error } = await supabaseCrm.auth.getSession()
  if (error) throw new AdminApiError(error.message, 401, "crm_session_error")
  const token = data.session?.access_token
  if (!token) throw new AdminApiError("Sessao CRM ausente.", 401, "crm_session_missing")
  return token
}

function createIdempotencyKey() {
  const webCrypto = globalThis.crypto
  if (webCrypto.randomUUID) {
    return webCrypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  webCrypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`
}

async function parseWorkerError(response: Response): Promise<AdminApiError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> }
      message?: string
    }
    return new AdminApiError(
      body.error?.message ?? body.message ?? "Erro na chamada admin.",
      response.status,
      body.error?.code,
      body.error?.fieldErrors
    )
  } catch {
    return new AdminApiError("Erro na chamada admin.", response.status)
  }
}

export async function adminRpc<T>(name: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = (await supabaseCrm.rpc(name, params)) as RpcResult<T>
  if (error) throw new AdminApiError(error.message, 400, "admin_rpc_error")
  return data as T
}

export async function adminMutation<T>(
  path: string,
  options: { method?: "POST" | "PATCH"; body?: unknown; idempotencyKey?: string } = {}
): Promise<T> {
  const token = await getCrmAccessToken()
  const response = await fetch(`${apiUrl}${normalizePath(path)}`, {
    method: options.method ?? "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey ?? createIdempotencyKey(),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw await parseWorkerError(response)
  }

  return (await response.json()) as T
}

export type AdminUserListRow = {
  user_id: string
  email: string
  nome_completo: string
  tier: string
  role: string
  is_active: boolean
  objective: string | null
  age: number | null
  sex: string | null
  created_at: string
  last_seen_at: string | null
  access_status: string
  cursor_created_at: string
  cursor_user_id: string
}

export type AdminUserLookupRow = {
  user_id: string
  email: string
  nome_completo: string
  tier: string
  role: string
  is_active: boolean
  access_status: string
  revenue_net_cents: number
  created_at: string
}

export type AdminUsersRevenueRankRow = {
  user_id: string
  email: string
  nome_completo: string
  tier: string
  access_status: string
  revenue_net_cents: number
}

export type AdminUserDetailRow = {
  user_profile: Record<string, unknown>
  latest_quiz_response: Record<string, unknown> | null
  current_program: Record<string, unknown> | null
  workout_rollup: Record<string, unknown> | null
  recent_workout_sessions: Record<string, unknown>[]
  recent_weight_logs: Record<string, unknown>[]
  recent_suggestions: Record<string, unknown>[]
  lastlink_products: Record<string, unknown>[]
  finance_rollup: Record<string, unknown> | null
  depends_on_future_rollups: boolean
}

export type AdminAppSettingsRow = {
  app_name: string
  trinca_product_ids: string[]
  elite_product_ids: string[]
  trinca_validity_days: number
  elite_validity_days: number
  upgrade_url: string | null
  renewal_trinca_url: string | null
  renewal_elite_url: string | null
  support_url: string | null
  reassessment_days: number
  depends_on_future_table: boolean
  blocked_by: string | null
}

export type AdminUserMutationResponse = {
  userId: string
  email: string
  nomeCompleto: string
  tier: string
  role: string
  isActive: boolean
}

export type AdminTemporaryPasswordResponse =
  | { status: "issued"; temporaryPassword: string }
  | { status: "already_issued" }
