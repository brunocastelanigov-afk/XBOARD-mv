import { ChevronDown, GripVertical, Trash2 } from "lucide-react"

import { Card } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export interface ReorderableListItemProps {
  order: number
  title: string
  metadata?: string[]
  onRemove: () => void
  onExpand?: () => void
  draggable?: boolean
  className?: string
}

export function ReorderableListItem({
  order,
  title,
  metadata,
  onRemove,
  onExpand,
  draggable,
  className,
}: ReorderableListItemProps) {
  return (
    <Card className={cn("flex-row items-center gap-3 p-3", className)}>
      {draggable && <GripVertical className="size-4 shrink-0 text-muted-foreground" />}
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {order}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {metadata && metadata.length > 0 && (
          <p className="text-xs text-muted-foreground">{metadata.join(" · ")}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onExpand && (
          <Button type="button" size="icon-sm" variant="ghost" onClick={onExpand} aria-label="Expandir">
            <ChevronDown />
          </Button>
        )}
        <Button type="button" size="icon-sm" variant="destructive" onClick={onRemove} aria-label="Remover">
          <Trash2 />
        </Button>
      </div>
    </Card>
  )
}
