import { cn } from "@/lib/utils"

export interface ColorPickerFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

function ColorPickerField({
  label,
  value,
  onChange,
  className,
}: ColorPickerFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-6 cursor-pointer rounded-md border border-input bg-transparent p-0"
        />
        <span className="text-sm text-muted-foreground uppercase">
          {value}
        </span>
      </div>
    </div>
  )
}
ColorPickerField.displayName = "ColorPickerField"

export { ColorPickerField }
