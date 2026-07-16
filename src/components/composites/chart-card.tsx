import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { cn } from "@/lib/utils"

interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  children: React.ReactNode
}

export function ChartCard({ title, description, children, className, ...props }: ChartCardProps) {
  return (
    <Card className={cn("rounded-lg border-border shadow-sm flex flex-col", className)} {...props}>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        {children}
      </CardContent>
    </Card>
  )
}
