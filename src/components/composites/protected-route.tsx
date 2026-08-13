import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import type { ReactNode } from "react"

const GROUP_HOME: Record<"crm" | "traffic", string> = {
  crm: "/crm/usuarios",
  traffic: "/roi-campanhas",
}

export function ProtectedRoute({
  children,
  group,
}: {
  children: ReactNode
  /** Restricts this route subtree to accounts of the given role group (Story 15.4). */
  group?: "crm" | "traffic"
}) {
  const { loading, session, isAllowedTeamUser, isCrmRole } = useAuth()
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

  if (group) {
    const accountGroup: "crm" | "traffic" = isCrmRole ? "crm" : "traffic"
    if (accountGroup !== group) {
      return <Navigate to={GROUP_HOME[accountGroup]} replace />
    }
  }

  return <>{children}</>
}
