import { Card, CardContent } from "@/components/atoms/card"
import { SearchInput } from "@/components/atoms/search-input"
import { Badge } from "@/components/atoms/badge"
import { cn } from "@/lib/utils"

export interface LinkedEntitySearchItem {
  id: string
  label: string
}

export interface LinkedEntitySearchGroup {
  label: string
  items: LinkedEntitySearchItem[]
}

export interface LinkedEntitySearchListProps {
  query: string
  onQueryChange: (value: string) => void
  groups: LinkedEntitySearchGroup[]
  onSelect: (item: LinkedEntitySearchItem) => void
  className?: string
}

export function LinkedEntitySearchList({
  query,
  onQueryChange,
  groups,
  onSelect,
  className,
}: LinkedEntitySearchListProps) {
  return (
    <Card className={cn("rounded-lg border-border shadow-sm", className)}>
      <CardContent className="space-y-3 p-4">
        <SearchInput
          placeholder="Buscar exercício cadastrado..."
          value={query}
          onChange={onQueryChange}
        />
        <div className="max-h-64 space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p className="text-xs font-medium uppercase text-muted-foreground">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {item.label}
                    <Badge variant="outline">{group.label}</Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
