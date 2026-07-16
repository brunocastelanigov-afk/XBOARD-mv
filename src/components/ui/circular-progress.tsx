import { cn } from "@/lib/utils"

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  showPercentage?: boolean
}

const ringSuccess = "stroke-success"

function CircularProgress({
  value,
  size = 36,
  strokeWidth = 3,
  className,
  showPercentage = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (clampedValue / 100) * circumference

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(ringSuccess, "transition-all duration-500 ease-out")}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-[10px] font-medium tabular-nums text-foreground">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  )
}

export { CircularProgress }
