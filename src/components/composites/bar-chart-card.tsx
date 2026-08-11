import { Bar, BarChart, Cell, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartCard } from "@/components/composites/chart-card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/atoms/chart"

export interface BarChartCardDatum {
  label: string
  value: number
  color: string
}

interface BarChartCardProps {
  data: BarChartCardDatum[]
  orientation: "horizontal" | "vertical"
  title: string
  className?: string
}

export function BarChartCard({ data, orientation, title, className }: BarChartCardProps) {
  const config: ChartConfig = data.reduce((acc, item) => {
    acc[item.label] = { label: item.label, color: item.color }
    return acc
  }, {} as ChartConfig)

  const isHorizontal = orientation === "horizontal"

  return (
    <ChartCard title={title} className={className}>
      <ChartContainer config={config} className="max-h-60 w-full">
        <BarChart data={data} layout={isHorizontal ? "vertical" : "horizontal"}>
          <CartesianGrid strokeDasharray="3 3" vertical={isHorizontal} horizontal={!isHorizontal} />
          {isHorizontal ? (
            <>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={90} />
            </>
          ) : (
            <>
              <XAxis type="category" dataKey="label" tickLine={false} axisLine={false} />
              <YAxis type="number" hide />
            </>
          )}
          <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
          <Bar dataKey="value" radius={4}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}
