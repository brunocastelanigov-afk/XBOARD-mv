import { Inbox, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon?: LucideIcon
  message: string
  className?: string
}

function EmptyState({ icon: Icon = Inbox, message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-center",
        className
      )}
    >
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
EmptyState.displayName = "EmptyState"

export { EmptyState }
