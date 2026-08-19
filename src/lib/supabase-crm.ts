import { createClient } from "@supabase/supabase-js"

const supabaseCrmUrl = import.meta.env.VITE_SUPABASE_CRM_URL as string | undefined
const supabaseCrmAnonKey = import.meta.env.VITE_SUPABASE_CRM_ANON_KEY as string | undefined

if (!supabaseCrmUrl || !supabaseCrmAnonKey) {
  throw new Error(
    "Missing CRM Supabase config. Set VITE_SUPABASE_CRM_URL and VITE_SUPABASE_CRM_ANON_KEY."
  )
}

export const supabaseCrm = createClient(supabaseCrmUrl, supabaseCrmAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})

/**
 * Matches Supabase/GoTrue auth rejections that leave the local session stuck (e.g. "JWT issued
 * at future" from a clock-skewed or stale token) — errors no client-side retry can fix, only a
 * fresh sign-in can.
 */
const STUCK_SESSION_ERROR_PATTERN = /jwt|issued at future|invalid token|token is expired|signature/i

export function isStuckSessionError(message: string | null | undefined) {
  return Boolean(message) && STUCK_SESSION_ERROR_PATTERN.test(message as string)
}

let recoveringStuckSession = false

/** Signs out the wedged CRM session and reloads so the user lands back on the login screen. */
export function recoverFromStuckSession() {
  if (recoveringStuckSession) return
  recoveringStuckSession = true
  void supabaseCrm.auth.signOut().finally(() => {
    window.location.reload()
  })
}
