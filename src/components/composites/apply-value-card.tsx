import { Check, CheckCircle2, Loader2 } from "lucide-react"

import { Input } from "@/components/atoms/input"
import { Button } from "@/components/atoms/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card"
import { cn } from "@/lib/utils"

export type ApplyValueCardApplyState = "idle" | "loading" | "success"

interface ApplyValueCardProps {
  title?: string
  description?: string
  label: string
  value: string | number
  onChange: (value: string) => void
  onApply: () => void
  canApply?: boolean
  applyState?: ApplyValueCardApplyState
  helpText?: string
  lastAppliedText?: string
  className?: string
}

export function ApplyValueCard({
  title,
  description,
  label,
  value,
  onChange,
  onApply,
  canApply = true,
  applyState = "idle",
  helpText,
  lastAppliedText,
  className,
}: ApplyValueCardProps) {
  return (
    <Card className={cn("rounded-lg border border-border shadow-sm", className)}>
      <CardHeader className="p-4 pb-2">
        {title ? (
          <>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </>
        ) : (
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {title && (
          <label className="block space-y-2">
            <span className="text-sm font-medium">{label}</span>
          </label>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={!canApply || applyState !== "idle"}
            className="max-w-36"
          />
          {canApply && (
            <Button
              type="button"
              onClick={onApply}
              disabled={applyState !== "idle"}
              className={cn(applyState === "success" && "bg-green-600 hover:bg-green-600 text-white")}
            >
              {applyState === "loading" ? (
                <>
                  <Loader2 className="animate-spin" />
                  Aplicando...
                </>
              ) : applyState === "success" ? (
                <>
                  <Check />
                  Aplicado!
                </>
              ) : (
                "Aplicar"
              )}
            </Button>
          )}
        </div>
        {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        {lastAppliedText && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-green-500" />
            {lastAppliedText}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
