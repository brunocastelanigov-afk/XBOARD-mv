import * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card"
import { cn } from "@/lib/utils"

interface TwoColumnFormLayoutColumn {
  title: string
  children: React.ReactNode
}

interface TwoColumnFormLayoutProps {
  left: TwoColumnFormLayoutColumn
  right: TwoColumnFormLayoutColumn
  className?: string
}

export function TwoColumnFormLayout({ left, right, className }: TwoColumnFormLayoutProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 md:grid-cols-2", className)}>
      {[left, right].map((column, index) => (
        <Card key={index} className="rounded-lg border-border shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">{column.children}</CardContent>
        </Card>
      ))}
    </div>
  )
}
