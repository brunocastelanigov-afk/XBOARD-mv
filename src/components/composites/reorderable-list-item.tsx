import { ChevronDown, GripVertical, Trash2 } from "lucide-react"
import { useSortable } from "@dnd-kit/react/sortable"

import { Card } from "@/components/atoms/card"
import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export interface ReorderableListItemProps {
  /** Stable unique id for drag-and-drop identity. Falls back to `title` when omitted (non-draggable items). */
  id?: string
  /** Current position within its list, required for drag-and-drop reordering. Falls back to `order`. */
  index?: number
  order: number
  title: string
  metadata?: string[]
  onRemove: () => void
  onExpand?: () => void
  draggable?: boolean
  className?: string
}

export function ReorderableListItem({
  id,
  index,
  order,
  title,
  metadata,
  onRemove,
  onExpand,
  draggable,
  className,
}: ReorderableListItemProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: id ?? title,
    index: index ?? order,
    disabled: !draggable,
  })

  return (
    <Card
      ref={draggable ? ref : undefined}
      className={cn("flex-row items-center gap-3 p-3", isDragging && "opacity-50", className)}
    >
      {draggable && (
        <button
          type="button"
          ref={handleRef}
          className="cursor-grab touch-none text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="size-4 shrink-0" />
        </button>
      )}
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
