import { EntityCard, type EntityCardBadge } from "@/components/composites/entity-card"
import { ProgressListItem } from "@/components/atoms/progress-list-item"
import { cn } from "@/lib/utils"

export interface DrilldownQuestionCardProps {
  index: number | string
  question: string
  type: string
  respondedCount: number
  arrivalPercent: number
  avgTime?: string
  alert?: string
  className?: string
}

export function DrilldownQuestionCard({
  index,
  question,
  type,
  respondedCount,
  arrivalPercent,
  avgTime,
  alert,
  className,
}: DrilldownQuestionCardProps) {
  const metadata = [`${respondedCount} responderam`]
  if (avgTime) metadata.push(`Tempo médio: ${avgTime}`)

  const badges: EntityCardBadge[] = [{ label: type, variant: "outline" }]
  if (alert) badges.push({ label: alert, variant: "destructive" })

  return (
    <EntityCard
      className={cn(alert && "border-l-4 border-l-destructive", className)}
      title={`${index}. ${question}`}
      badges={badges}
      metadata={metadata}
      expandable
    >
      <ProgressListItem
        label="Chegaram até aqui"
        value={`${arrivalPercent}%`}
        percent={arrivalPercent}
        color={alert ? "destructive" : "primary"}
      />
    </EntityCard>
  )
}
