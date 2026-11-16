import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { supabaseCrm } from "@/lib/supabase-crm"

type SessionSource = "traffic" | "crm"

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  isAllowedTeamUser: boolean
  dashboardRole: string | null
  /** Traffic source this user is locked to (derived from a `dashboard_role` of the form
   * `<source>_only`, e.g. "tiktok_only" -> "tiktok", "google_only" -> "google"), or null if
   * the user isn't restricted. Generalizes the tiktok-only isolation from Story 1.4 to any
   * source. Real enforcement lives server-side in the RPCs — this only drives the UI. */
  restrictedTrafficSourceId: string | null
  /** Every traffic source this user may see (one entry for `<source>_only`, several for
   * multi-source roles such as `leo_traffic`), or null if unrestricted. Real enforcement is
   * server-side (`dashboard_allowed_sources()` in the RPCs). */
  restrictedTrafficSourceIds: string[] | null
  /** True for accounts that may only open /roi-campanhas (currently `leo_traffic`). */
  isRoiOnlyRole: boolean
  /** True when the active session is a CRM account (`dashboard_role === "crm"`, Story 15.1
   * Decision 2), authenticated directly against the app's Supabase (`supabaseCrm`). Drives the
   * sidebar role gate (Story 15.3) — never derived via regex, "crm" has no `_only` suffix. */
  isCrmRole: boolean
  signOut: () => Promise<void>
}

// Roles com mais de uma fonte (devem espelhar public.dashboard_allowed_sources()).
// "meta_leo" = campanhas Meta do Leo ($3/$5), fonte virtual derivada no servidor.
const MULTI_SOURCE_ROLES: Record<string, string[]> = {
  leo_traffic: ["google", "meta_leo"],
}

// Roles que só podem abrir /roi-campanhas.
const ROI_ONLY_ROLES = new Set(["leo_traffic"])

function deriveRestrictedTrafficSourceIds(dashboardRole: string | null): string[] | null {
  if (!dashboardRole) return null
  const multi = MULTI_SOURCE_ROLES[dashboardRole]
  if (multi) return multi
  const match = dashboardRole.match(/^(.+)_only$/)
  return match ? [match[1]] : null
}

const allowedEmails = (
  import.meta.env.VITE_DASHBOARD_TEAM_EMAIL as string | undefined
)?.toLowerCase().split(',').map(e => e.trim()) || []

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [trafficSession, setTrafficSession] = useState<Session | null>(null)
  const [crmSession, setCrmSession] = useState<Session | null>(null)
  const [trafficLoaded, setTrafficLoaded] = useState(false)
  const [crmLoaded, setCrmLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setTrafficSession(data.session)
      setTrafficLoaded(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTrafficSession(nextSession)
      setTrafficLoaded(true)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    supabaseCrm.auth.getSession().then(({ data }) => {
      setCrmSession(data.session)
      setCrmLoaded(true)
    })

    const { data } = supabaseCrm.auth.onAuthStateChange((_event, nextSession) => {
      setCrmSession(nextSession)
      setCrmLoaded(true)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const loading = !trafficLoaded || !crmLoaded

  const value = useMemo<AuthContextValue>(() => {
    // Traffic wins on the (should-never-happen) case both clients have an active session at
    // once — Story 15.1 Decision 4 guarantees the two never coexist for the same user.
    const session = trafficSession ?? crmSession
    const source: SessionSource = trafficSession ? "traffic" : "crm"
    const user = session?.user ?? null
    const email = user?.email?.toLowerCase() ?? null
    const dashboardRole = (user?.app_metadata?.dashboard_role as string | undefined) ?? null
    const isCrmRole = dashboardRole === "crm"
    const restrictedTrafficSourceIds = deriveRestrictedTrafficSourceIds(dashboardRole)

    const isAllowedTeamUser =
      source === "traffic"
        ? Boolean(email && allowedEmails.includes(email))
        : isCrmRole

    return {
      session,
      user,
      loading,
      isAllowedTeamUser,
      dashboardRole,
      restrictedTrafficSourceId:
        restrictedTrafficSourceIds?.length === 1 ? restrictedTrafficSourceIds[0] : null,
      restrictedTrafficSourceIds,
      isRoiOnlyRole: Boolean(dashboardRole && ROI_ONLY_ROLES.has(dashboardRole)),
      isCrmRole,
      signOut: () =>
        (source === "crm" ? supabaseCrm.auth.signOut() : supabase.auth.signOut()).then(
          () => undefined
        ),
    }
  }, [loading, trafficSession, crmSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.")
  }

  return context
}
