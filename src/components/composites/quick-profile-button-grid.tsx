import { Button } from "@/components/atoms/button"
import { cn } from "@/lib/utils"

export interface QuickProfile {
  label: string
  values: Record<string, string>
}

export interface QuickProfileButtonGridProps {
  profiles: QuickProfile[]
  onSelect: (profile: QuickProfile) => void
  className?: string
}

export function QuickProfileButtonGrid({
  profiles,
  onSelect,
  className,
}: QuickProfileButtonGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {profiles.map((profile) => (
        <Button
          key={profile.label}
          type="button"
          variant="outline"
          onClick={() => onSelect(profile)}
          className="justify-start"
        >
          {profile.label}
        </Button>
      ))}
    </div>
  )
}
