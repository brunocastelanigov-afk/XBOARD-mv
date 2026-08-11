import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/atoms/button"
import { Input } from "@/components/atoms/input"
import { cn } from "@/lib/utils"

export interface StepperInputProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

function clamp(value: number, min?: number, max?: number) {
  let next = value
  if (typeof min === "number") next = Math.max(min, next)
  if (typeof max === "number") next = Math.min(max, next)
  return next
}

function StepperInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  className,
}: StepperInputProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(clamp(value - step, min, max))}
        disabled={disabled || (typeof min === "number" && value <= min)}
      >
        <Minus />
      </Button>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="w-16 text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(clamp(value + step, min, max))}
        disabled={disabled || (typeof max === "number" && value >= max)}
      >
        <Plus />
      </Button>
    </div>
  )
}
StepperInput.displayName = "StepperInput"

export { StepperInput }
