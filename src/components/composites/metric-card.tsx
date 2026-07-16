import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { cn } from "@/lib/utils"

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: React.ReactNode
  delta?: string
  deltaType?: "positive" | "negative" | "neutral"
}

export function MetricCard({ title, value, delta, deltaType, className, ...props }: MetricCardProps) {
  return (
    <Card className={cn("rounded-lg border-border shadow-sm", className)} {...props}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col gap-1">
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {delta && (
          <p className={cn(
            "text-xs",
            deltaType === "positive" ? "text-success" : deltaType === "negative" ? "text-destructive" : "text-muted-foreground"
          )}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
