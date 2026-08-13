import { supabaseCrm } from "@/lib/supabase-crm"

const apiUrl = import.meta.env.VITE_API_URL as string | undefined

export class AdminApiError extends Error {
  status: number
  code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = "AdminApiError"
    this.status = status
    this.code = code
  }
}

async function crmAccessToken() {
  const { data, error } = await supabaseCrm.auth.getSession()
  if (error) throw new AdminApiError(error.message, 401, "crm_session_error")
  const token = data.session?.access_token
  if (!token) throw new AdminApiError("Sessao CRM ausente. Faca login novamente.", 401, "missing_crm_session")
  return token
}

function adminEndpoint(path: string) {
  if (!apiUrl) {
    throw new AdminApiError("VITE_API_URL nao configurado para chamadas admin.", 500, "missing_api_url")
  }
  return `${apiUrl.replace(/\/$/, "")}${path}`
}

async function readError(response: Response) {
  const fallback = response.statusText || "Erro na chamada admin"
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown; code?: unknown }
    const message = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : fallback
    const code = typeof body.code === "string" ? body.code : null
    return new AdminApiError(message, response.status, code)
  } catch {
    return new AdminApiError(fallback, response.status)
  }
}

export async function adminMutation<T>(path: string, init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown }) {
  const token = await crmAccessToken()
  const response = await fetch(adminEndpoint(path), {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (!response.ok) throw await readError(response)
  return (await response.json()) as T
}

export async function adminRead<T>(path: string) {
  const token = await crmAccessToken()
  const response = await fetch(adminEndpoint(path), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) throw await readError(response)
  return (await response.json()) as T
}

function rpcErrorMessage(error: { message?: string; details?: string | null; hint?: string | null }) {
  return [error.message, error.details, error.hint].filter(Boolean).join(" ")
}

export async function adminRpc<T>(name: string, args?: Record<string, unknown>) {
  const { data, error } = await supabaseCrm.rpc(name, args)
  if (error) throw new AdminApiError(rpcErrorMessage(error), 400, error.code ?? "rpc_error")
  return data as T
}

export async function adminSelect<T>(table: string, columns = "*") {
  const { data, error } = await supabaseCrm.from(table).select(columns)
  if (error) throw new AdminApiError(rpcErrorMessage(error), 400, error.code ?? "select_error")
  return data as T
}
