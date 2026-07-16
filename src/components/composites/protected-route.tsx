import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import type { ReactNode } from "react"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session, isAllowedTeamUser } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAllowedTeamUser) {
    return <Navigate to="/login" replace state={{ reason: "forbidden" }} />
  }

  return <>{children}</>
}
