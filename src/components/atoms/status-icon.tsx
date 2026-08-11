import { AlertTriangle, CheckCircle2, Clock, Lock, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type StatusIconStatus = "pending" | "done" | "locked" | "warning"

export interface StatusIconProps {
  status: StatusIconStatus
  size?: "sm" | "md" | "lg"
  className?: string
}

const statusConfig: Record<
  StatusIconStatus,
  { icon: LucideIcon; className: string }
> = {
  pending: { icon: Clock, className: "text-muted-foreground" },
  done: { icon: CheckCircle2, className: "text-success" },
  locked: { icon: Lock, className: "text-primary" },
  warning: { icon: AlertTriangle, className: "text-destructive" },
}

const sizeClassMap: Record<NonNullable<StatusIconProps["size"]>, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
}

function StatusIcon({ status, size = "md", className }: StatusIconProps) {
  const { icon: Icon, className: statusClassName } = statusConfig[status]
  return <Icon className={cn(sizeClassMap[size], statusClassName, className)} />
}
StatusIcon.displayName = "StatusIcon"

export { StatusIcon }
