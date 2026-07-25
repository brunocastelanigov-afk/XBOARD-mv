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
  signOut: () => Promise<void>
}

function deriveRestrictedTrafficSourceId(dashboardRole: string | null): string | null {
  if (!dashboardRole) return null
  const match = dashboardRole.match(/^(.+)_only$/)
  return match ? match[1] : null
}

const allowedEmails = (
  import.meta.env.VITE_DASHBOARD_TEAM_EMAIL as string | undefined
)?.toLowerCase().split(',').map(e => e.trim()) || []

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null
    const email = user?.email?.toLowerCase() ?? null
    const dashboardRole = (user?.app_metadata?.dashboard_role as string | undefined) ?? null

    return {
      session,
      user,
      loading,
      isAllowedTeamUser: Boolean(email && allowedEmails.includes(email)),
      dashboardRole,
      restrictedTrafficSourceId: deriveRestrictedTrafficSourceId(dashboardRole),
      signOut: () => supabase.auth.signOut().then(() => undefined),
    }
  }, [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.")
  }

  return context
}
