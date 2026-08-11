import { Cell, Pie, PieChart } from "recharts"

import { ChartCard } from "@/components/composites/chart-card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/atoms/chart"

export interface DonutChartCardDatum {
  label: string
  value: number
  color: string
}

interface DonutChartCardProps {
  data: DonutChartCardDatum[]
  title: string
  className?: string
}

export function DonutChartCard({ data, title, className }: DonutChartCardProps) {
  const config: ChartConfig = data.reduce((acc, item) => {
    acc[item.label] = { label: item.label, color: item.color }
    return acc
  }, {} as ChartConfig)

  return (
    <ChartCard title={title} className={className}>
      <ChartContainer config={config} className="mx-auto aspect-square max-h-60">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="label" />} />
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} strokeWidth={2}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </ChartCard>
  )
}
