import { Edit, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"

import { EntityCard, type EntityCardAction, type EntityCardBadge } from "@/components/composites/entity-card"
import { cn } from "@/lib/utils"

export interface OverrideRuleCardProps {
  priority: number
  condition: string
  result: string
  override?: boolean
  active: boolean
  onToggleActive?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

export function OverrideRuleCard({
  priority,
  condition,
  result,
  override,
  active,
  onToggleActive,
  onEdit,
  onDelete,
  className,
}: OverrideRuleCardProps) {
  const badges: EntityCardBadge[] = [
    { label: active ? "Ativa" : "Inativa", variant: active ? "default" : "secondary" },
  ]
  if (override) badges.unshift({ label: "⚠ OVERRIDE", variant: "destructive" })

  const actions: EntityCardAction[] = []
  if (onToggleActive) {
    actions.push({
      icon: active ? ToggleRight : ToggleLeft,
      onClick: onToggleActive,
      label: active ? "Desativar" : "Ativar",
    })
  }
  if (onEdit) actions.push({ icon: Edit, onClick: onEdit, label: "Editar" })
  if (onDelete) actions.push({ icon: Trash2, onClick: onDelete, variant: "destructive", label: "Excluir" })

  return (
    <EntityCard
      className={cn(override && "border-l-4 border-l-destructive", className)}
      title={`Prioridade ${priority}`}
      badges={badges}
      metadata={[condition, `→ ${result}`]}
      actions={actions}
    />
  )
}
