import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/atoms/tabs"
import { cn } from "@/lib/utils"

export interface WizardTabsStep {
  label: string
  icon: LucideIcon
}

export interface WizardTabsSummaryItem {
  label: string
  value: string | number
}

export interface WizardTabsProps {
  steps: WizardTabsStep[]
  active: string
  onActiveChange?: (value: string) => void
  summary?: WizardTabsSummaryItem[]
  children?: React.ReactNode
  className?: string
}

export function WizardTabs({
  steps,
  active,
  onActiveChange,
  summary,
  children,
  className,
}: WizardTabsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {summary && summary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {summary.map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      )}
      <Tabs value={active} onValueChange={onActiveChange}>
        <TabsList>
          {steps.map((step) => (
            <TabsTrigger key={step.label} value={step.label} className="gap-1.5">
              <step.icon className="size-4" />
              {step.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {children}
      </Tabs>
    </div>
  )
}
